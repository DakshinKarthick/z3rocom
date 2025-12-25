import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { DbMessage, DbMessageKind, DbSession } from "@/lib/supabase/model"
import { ensureSignedIn, generateSessionCode } from "@/lib/supabase/helpers"

export async function createSession(input: {
  name: string
  agenda: string
  durationMinutes: number
  hostDisplayName: string
}) {
  const supabase = getSupabaseBrowserClient()
  const user = await ensureSignedIn()

  const endsAtIso = new Date(Date.now() + input.durationMinutes * 60_000).toISOString()

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateSessionCode(6)
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        code,
        name: input.name,
        agenda: input.agenda,
        duration_minutes: input.durationMinutes,
        created_by: user.id,
        timer_ends_at: endsAtIso,
      })
      .select("*")
      .single<DbSession>()

    if (!error && session) {
      await supabase.from("session_members").upsert(
        {
          session_id: session.id,
          user_id: user.id,
          display_name: input.hostDisplayName,
        },
        { onConflict: "session_id,user_id" },
      )

      // Seed initial shared messages (no new UI needed).
      await insertMessage({
        sessionId: session.id,
        kind: "command-echo",
        content: `/session "${session.name}"`,
        authorName: "system",
      })

      await insertMessage({
        sessionId: session.id,
        kind: "system",
        content: `Agenda locked: ${session.agenda}`,
        authorName: "system",
      })

      await insertMessage({
        sessionId: session.id,
        kind: "system",
        content: `Timer started: ${session.duration_minutes}m focus session`,
        authorName: "system",
      })

      // Helpful system message so the host can share the code.
      await insertMessage({
        sessionId: session.id,
        kind: "system",
        content: `Session code: ${session.code}`,
        authorName: "system",
      })

      return session
    }

    // Retry on duplicate code
    if ((error as any)?.code === "23505") continue

    throw error
  }

  throw new Error("Failed to allocate a unique session code")
}

export async function getSessionByCode(code: string) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase.rpc("session_preview", { p_code: code }).single<DbSession>()
  if (error) throw error
  return data
}

export async function getSessionById(id: string) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).single<DbSession>()
  if (error) throw error
  return data
}

export async function getMemberCount(sessionId: string) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase.rpc("session_member_count", { p_session_id: sessionId })
  if (error) throw error
  return (data as number) ?? 0
}

export async function joinSession(input: { sessionId: string; displayName: string }) {
  const supabase = getSupabaseBrowserClient()
  const user = await ensureSignedIn()

  const { error } = await supabase.from("session_members").upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      display_name: input.displayName,
    },
    { onConflict: "session_id,user_id" },
  )

  if (error) throw error
  return user
}

export async function listMessages(sessionId: string, limit = 200) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit)
    .returns<DbMessage[]>()

  if (error) throw error
  return data
}

export async function insertMessage(input: {
  sessionId: string
  kind: DbMessageKind
  content: string
  authorName: string
  id?: string
}) {
  const supabase = getSupabaseBrowserClient()
  const user = await ensureSignedIn()

  const id = input.id ?? crypto.randomUUID()

  const { data, error } = await supabase
    .from("messages")
    .insert({
      id,
      session_id: input.sessionId,
      author_id: user.id,
      author_name: input.authorName,
      kind: input.kind,
      content: input.content,
    })
    .select("*")
    .single<DbMessage>()

  if (error) throw error
  return data
}

export async function setAgenda(sessionId: string, agenda: string) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase
    .from("sessions")
    .update({ agenda })
    .eq("id", sessionId)
    .select("*")
    .single<DbSession>()

  if (error) throw error
  return data
}

export async function setTimerEndsAt(sessionId: string, endsAtIso: string | null) {
  const supabase = getSupabaseBrowserClient()
  await ensureSignedIn()
  const { data, error } = await supabase
    .from("sessions")
    .update({ timer_ends_at: endsAtIso })
    .eq("id", sessionId)
    .select("*")
    .single<DbSession>()

  if (error) throw error
  return data
}

export function subscribeToMessages(sessionId: string, onInsert: (msg: DbMessage) => void) {
  const supabase = getSupabaseBrowserClient()

  const channel = supabase
    .channel(`messages:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onInsert(payload.new as DbMessage)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToSession(sessionId: string, onUpdate: (session: DbSession) => void) {
  const supabase = getSupabaseBrowserClient()

  const channel = supabase
    .channel(`session:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onUpdate(payload.new as DbSession)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
