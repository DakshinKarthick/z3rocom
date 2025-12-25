"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Users, Clock, Target, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getMemberCount, getSessionByCode, joinSession } from "@/lib/supabase/chat"

interface SessionPreview {
  id: string
  code: string
  name: string
  agenda: string
  duration: number
  participants: number
  timeRemaining: number
}

export default function JoinPage() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [preview, setPreview] = useState<SessionPreview | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    codeInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (sessionCode.length === 6) {
      setIsValidating(true)
      const handle = window.setTimeout(async () => {
        try {
          const session = await getSessionByCode(sessionCode)
          const participants = await getMemberCount(session.id)

          const timeRemaining = session.timer_ends_at
            ? Math.max(0, Math.ceil((new Date(session.timer_ends_at).getTime() - Date.now()) / 60000))
            : session.duration_minutes

          setPreview({
            id: session.id,
            code: session.code,
            name: session.name,
            agenda: session.agenda,
            duration: session.duration_minutes,
            participants,
            timeRemaining,
          })
        } catch {
          setPreview(null)
        } finally {
          setIsValidating(false)
        }
      }, 350)

      return () => window.clearTimeout(handle)
    } else {
      setPreview(null)
    }
  }, [sessionCode])

  const handleJoin = async () => {
    if (!preview) return
    if (isJoining) return

    setIsJoining(true)
    try {
      const name = displayName.trim() || "Guest"
      await joinSession({ sessionId: preview.id, displayName: name })

      sessionStorage.setItem(
        "z3ro-session",
        JSON.stringify({
          id: preview.id,
          code: preview.code,
          name: preview.name,
          agenda: preview.agenda,
          duration: preview.duration,
          creator: "host",
          createdAt: new Date().toISOString(),
        }),
      )
      sessionStorage.setItem("z3ro-display-name", name)
      router.push("/session")
    } finally {
      setIsJoining(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && preview) {
      handleJoin()
    }
  }

  const formatCodeInput = (value: string) => {
    // Only allow alphanumeric, uppercase, max 6 chars
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0D0D0D" }}>
      {/* Header */}
      <header
        className="h-12 flex items-center justify-between px-4 border-b"
        style={{ backgroundColor: "#1A1A1A", borderColor: "#262626" }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" style={{ color: "#3B82F6" }} />
          <span className="font-mono text-sm font-bold" style={{ color: "#FFFFFF" }}>
            Z3RO
          </span>
          <span className="font-mono text-xs" style={{ color: "#52525B" }}>
            / join
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs"
          style={{ color: "#52525B" }}
          onClick={() => router.push("/setup")}
        >
          create new
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: "#FFFFFF" }}>
              Join Session
            </h1>
            <p className="text-sm font-mono" style={{ color: "#52525B" }}>
              Enter the session code to join
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Session code input */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider" style={{ color: "#52525B" }}>
                Session Code
              </label>
              <Input
                ref={codeInputRef}
                value={sessionCode}
                onChange={(e) => setSessionCode(formatCodeInput(e.target.value))}
                onKeyDown={handleKeyDown}
                placeholder="ABC123"
                maxLength={6}
                className="h-14 text-center text-2xl font-mono tracking-[0.5em] bg-[#1A1A1A] border-[#262626] placeholder:text-[#262626] placeholder:tracking-[0.5em] focus-visible:ring-1 focus-visible:ring-[#3B82F6] uppercase"
                style={{ color: "#FFFFFF" }}
              />
              {isValidating && (
                <p className="text-xs font-mono text-center" style={{ color: "#52525B" }}>
                  Validating...
                </p>
              )}
            </div>

            {/* Session preview */}
            {preview && (
              <div
                className="rounded border p-4 space-y-4 transition-all"
                style={{
                  backgroundColor: "#1A1A1A",
                  borderColor: "#3B82F6",
                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase" style={{ color: "#52525B" }}>
                    Session Preview
                  </span>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" style={{ color: "#10B981" }} />
                    <span className="font-mono text-xs" style={{ color: "#10B981" }}>
                      {preview.participants} active
                    </span>
                  </div>
                </div>

                <div>
                  <h2 className="font-semibold" style={{ color: "#FFFFFF" }}>
                    {preview.name}
                  </h2>
                </div>

                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#3B82F6" }} />
                  <p className="text-sm" style={{ color: "#A1A1AA" }}>
                    {preview.agenda}
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t" style={{ borderColor: "#262626" }}>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" style={{ color: "#52525B" }} />
                    <span className="font-mono text-xs" style={{ color: "#52525B" }}>
                      {preview.duration}m total
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs" style={{ color: "#F59E0B" }}>
                      {preview.timeRemaining}m remaining
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Display name (optional) */}
            {preview && (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider" style={{ color: "#52525B" }}>
                  Your Name
                  <span className="ml-2 normal-case" style={{ color: "#3D3D3D" }}>
                    (optional)
                  </span>
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Guest"
                  className="h-10 bg-[#0D0D0D] border-[#262626] font-mono text-sm placeholder:text-[#3D3D3D] focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
                  style={{ color: "#FFFFFF" }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 font-mono border-[#262626] hover:bg-[#1A1A1A] bg-transparent"
                style={{ color: "#52525B" }}
                onClick={() => router.push("/")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoin}
                disabled={!preview || isJoining}
                className="flex-1 h-11 font-mono bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Join Session</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer status */}
      <footer
        className="h-6 flex items-center justify-between px-4 border-t font-mono text-xs"
        style={{ backgroundColor: "#0D0D0D", borderColor: "#1A1A1A", color: "#3D3D3D" }}
      >
        <span>Enter 6-character session code</span>
        <span>Enter to join when valid</span>
      </footer>
    </div>
  )
}
