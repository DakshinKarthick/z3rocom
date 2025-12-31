export type DbMessageKind = "user" | "system" | "command-echo"

export interface DbSession {
  id: string
  code: string
  name: string
  agenda: string
  duration_minutes: number
  created_at: string
  created_by: string
  timer_ends_at: string | null
  focus_level: number
}

export interface DbMessage {
  id: string
  session_id: string
  author_id: string
  author_name: string
  kind: DbMessageKind
  content: string
  created_at: string
}

export interface DbSessionMember {
  id: string
  session_id: string
  user_id: string
  display_name: string
  joined_at: string
}
