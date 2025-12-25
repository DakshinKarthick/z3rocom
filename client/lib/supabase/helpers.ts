import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

export function generateSessionCode(length = 6) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let code = ""
  for (let i = 0; i < length; i++) {
    code += SESSION_CODE_ALPHABET[bytes[i] % SESSION_CODE_ALPHABET.length]
  }
  return code
}

export async function ensureSignedIn() {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) return data.user

  const { data: signInData, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error("Anonymous sign-in error:", error)
    throw new Error(`Anonymous sign-in failed: ${error.message}`)
  }
  if (!signInData.user) {
    throw new Error("Anonymous sign-in succeeded but no user returned")
  }
  return signInData.user
}

export function toTimeLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}
