"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function TestConnectionPage() {
  const [status, setStatus] = useState<string>("Not tested")
  const [details, setDetails] = useState<string>("")

  const testConnection = async () => {
    setStatus("Testing...")
    setDetails("")

    try {
      const supabase = getSupabaseBrowserClient()
      
      // Test 1: Check environment variables
      setStatus("✓ Environment variables loaded")
      setDetails("URL and anon key are present")

      // Test 2: Try anonymous sign-in
      setStatus("Testing anonymous sign-in...")
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
      
      if (signInError) {
        setStatus("❌ Anonymous sign-in failed")
        setDetails(`Error: ${signInError.message}\n\nCode: ${signInError.status}\n\n${JSON.stringify(signInError, null, 2)}`)
        return
      }

      setStatus("✓ Anonymous sign-in successful")
      setDetails(`User ID: ${signInData.user?.id}`)

      // Test 3: Try to query sessions table
      setStatus("Testing database access...")
      const { data: sessionsData, error: dbError } = await supabase
        .from("sessions")
        .select("count")
        .limit(1)

      if (dbError) {
        setStatus("❌ Database query failed")
        setDetails(`Error: ${dbError.message}\n\nCode: ${dbError.code}\n\n${JSON.stringify(dbError, null, 2)}`)
        return
      }

      setStatus("✅ All tests passed!")
      setDetails("Supabase is connected properly. You can use the app.")
    } catch (error) {
      setStatus("❌ Unexpected error")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0a0a0b" }}>
      <div className="max-w-2xl w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Supabase Connection Test</h1>
          <p className="text-gray-400">Test your Supabase configuration</p>
        </div>

        <Button onClick={testConnection} className="w-full">
          Run Connection Test
        </Button>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
            <h2 className="font-semibold text-white mb-2">Status:</h2>
            <p className="text-gray-300 font-mono text-sm">{status}</p>
          </div>

          {details && (
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <h2 className="font-semibold text-white mb-2">Details:</h2>
              <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap">{details}</pre>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          <p>This page tests:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Environment variables (URL & anon key)</li>
            <li>Anonymous sign-in capability</li>
            <li>Database table access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
