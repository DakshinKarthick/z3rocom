"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Clock, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSession } from "@/lib/supabase/chat"

export default function SetupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState("")
  const [sessionName, setSessionName] = useState("")
  const [agenda, setAgenda] = useState("")
  const [duration, setDuration] = useState(45)
  const [isStarting, setIsStarting] = useState(false)
  const displayNameInputRef = useRef<HTMLInputElement>(null)
  const agendaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check for seed data from previous session
    const seed = sessionStorage.getItem("z3ro-next-seed")
    if (seed) {
      const { proposedGoal, proposedDuration } = JSON.parse(seed)
      if (proposedGoal) setAgenda(proposedGoal)
      if (proposedDuration) setDuration(proposedDuration)
      sessionStorage.removeItem("z3ro-next-seed")
    }
    displayNameInputRef.current?.focus()
  }, [])

  const handleAgendaInput = (value: string) => {
    if (value.startsWith("/agenda ")) {
      setAgenda(value.slice(8))
    } else {
      setAgenda(value)
    }
  }

  const handleStart = async () => {
    if (!agenda.trim()) return
    if (!displayName.trim()) return
    if (isStarting) return

    setIsStarting(true)
    try {
      const creatorName = displayName.trim()
      const session = await createSession({
        name: sessionName.trim() || `Session ${new Date().toLocaleDateString()}`,
        agenda: agenda.trim(),
        durationMinutes: duration,
        hostDisplayName: creatorName,
      })

      sessionStorage.setItem(
        "z3ro-session",
        JSON.stringify({
          id: session.id,
          code: session.code,
          name: session.name,
          agenda: session.agenda,
          duration: session.duration_minutes,
          creator: "you",
          creatorName: creatorName,
          createdAt: session.created_at,
        }),
      )
      sessionStorage.setItem("z3ro-display-name", creatorName)
      sessionStorage.setItem("z3ro-is-creator", "true")
      router.push("/session")
    } catch (error) {
      console.error("Failed to create session:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Failed to start session: ${errorMessage}`)
    } finally {
      setIsStarting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && agenda.trim()) {
      handleStart()
    }
  }

  const canStart = agenda.trim().length > 0 && displayName.trim().length > 0

  return (
    <div className="min-h-screen flex flex-col grid-bg" style={{ backgroundColor: "#0a0a0b" }}>
      <div className="scanline-overlay" />

      {/* Header */}
      <header className="h-12 flex items-center justify-between px-6 border-b border-[#1a1a1f]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111113] border border-[#27272a]">
            <Terminal className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <span className="font-mono text-sm font-bold text-[#fafafa]">Z3RO</span>
          <span className="font-mono text-xs text-[#3f3f46]">/ setup</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs text-[#52525b] hover:text-[#a1a1aa]"
          onClick={() => router.push("/join")}
        >
          join existing
        </Button>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111113] border border-[#27272a]">
              <Sparkles className="h-3 w-3 text-[#3b82f6]" />
              <span className="font-mono text-xs text-[#a1a1aa]">New Session</span>
            </div>
            <h1 className="text-2xl font-bold text-[#fafafa]">Set Your Intent</h1>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Display name */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#52525b]">
                Your Name <span className="text-[#ef4444]">*</span>
              </label>
              <Input
                ref={displayNameInputRef}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="enter your name"
                className="h-11 bg-[#111113] border-[#27272a] font-mono text-sm text-[#fafafa] placeholder:text-[#3f3f46] focus-visible:border-[#3b82f6] focus-visible:ring-0 rounded-lg"
              />
            </div>

            {/* Session name */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#52525b]">
                Session Name <span className="text-[#3f3f46]">(optional)</span>
              </label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Morning Deep Work"
                className="h-11 bg-[#111113] border-[#27272a] font-mono text-sm text-[#fafafa] placeholder:text-[#3f3f46] focus-visible:border-[#3b82f6] focus-visible:ring-0 rounded-lg"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#52525b]">Duration</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 25, label: "25m", desc: "Pomodoro" },
                  { value: 45, label: "45m", desc: "Standard" },
                  { value: 90, label: "90m", desc: "Deep Work" },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setDuration(preset.value)}
                    className={`p-4 rounded-xl border transition-all focus-ring ${
                      duration === preset.value
                        ? "bg-[#111113] border-[#3b82f6] widget-active"
                        : "bg-[#0a0a0b] border-[#27272a] hover:border-[#3f3f46]"
                    }`}
                  >
                    <Clock
                      className={`h-5 w-5 mx-auto mb-2 ${
                        duration === preset.value ? "text-[#3b82f6]" : "text-[#52525b]"
                      }`}
                    />
                    <p className="font-mono text-lg font-bold text-[#fafafa]">{preset.label}</p>
                    <p className="text-xs text-[#52525b] mt-1">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Agenda (required) */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-[#52525b]">
                Agenda <span className="text-[#ef4444]">*</span>
              </label>
              <div
                className={`rounded-xl border p-4 transition-all ${
                  agenda.trim() ? "bg-[#111113] border-[#3b82f6] glow-blue" : "bg-[#0a0a0b] border-[#27272a]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[#3b82f6] shrink-0">/agenda</span>
                  <Input
                    ref={agendaInputRef}
                    value={agenda}
                    onChange={(e) => handleAgendaInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="what will you focus on?"
                    className="h-8 bg-transparent border-0 font-mono text-sm text-[#fafafa] placeholder:text-[#3f3f46] focus-visible:ring-0 p-0"
                  />
                </div>
                {!agenda && (
                  <p className="text-xs text-[#3f3f46] mt-2">Your agenda anchors the session. Keep it specific.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 font-mono border-[#27272a] hover:bg-[#111113] bg-transparent text-[#52525b] rounded-xl"
                onClick={() => router.push("/")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStart}
                disabled={!canStart || isStarting}
                className="flex-1 h-12 font-mono bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-30 rounded-xl group"
              >
                <span>Start Session</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 flex items-center justify-center border-t border-[#1a1a1f]">
        <span className="font-mono text-xs text-[#3f3f46]">Tab: Name → Session → Agenda → Duration → Start</span>
      </footer>
    </div>
  )
}
