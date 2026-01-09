"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, Lock, Terminal, Target, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type LockState = "none" | "soft" | "hard"
export type SessionStatus = "idle" | "active" | "paused" | "ended"

interface AppHeaderProps {
  timerMinutes?: number | null
  timerEndsAt?: string | null
  pinnedAgenda?: string
  onAgendaChange?: (agenda: string) => void
  onTimerSetMinutes?: (minutes: number) => void
  focusLevel?: number
  lockState?: LockState
  onSessionEnd?: () => void
  sessionStatus?: SessionStatus
  lastCommand?: string
  onMenuClick?: () => void
}

export function AppHeader({
  timerMinutes,
  timerEndsAt = null,
  pinnedAgenda = "",
  onAgendaChange,
  onTimerSetMinutes,
  focusLevel = 100,
  lockState = "none",
  onSessionEnd,
  sessionStatus = "idle",
  onMenuClick,
}: AppHeaderProps) {
  const [agenda, setAgenda] = useState("")
  const [isEditingAgenda, setIsEditingAgenda] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [lastMinuteAnnounced, setLastMinuteAnnounced] = useState(-1)
  const [timerInitialized, setTimerInitialized] = useState(false)

  // Prefer synced timer from timerEndsAt.
  useEffect(() => {
    if (!timerEndsAt) return

    const computeLeft = () => {
      const ms = new Date(timerEndsAt).getTime() - Date.now()
      return Math.max(0, Math.floor(ms / 1000))
    }

    const initial = computeLeft()
    setTimeLeft(initial)
    setIsTimerRunning(initial > 0)
    setTimerInitialized(true)

    const interval = window.setInterval(() => {
      const next = computeLeft()
      setTimeLeft(next)
      setIsTimerRunning(next > 0)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [timerEndsAt])

  // Fallback (local-only) timer when timerEndsAt isn't used.
  useEffect(() => {
    if (timerEndsAt) return
    if (timerMinutes) {
      setTimeLeft(timerMinutes * 60)
      setIsTimerRunning(true)
      setTimerInitialized(true)
    }
  }, [timerMinutes, timerEndsAt])

  useEffect(() => {
    if (timerEndsAt) return

    if (isTimerRunning && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isTimerRunning, timeLeft, timerEndsAt])

  useEffect(() => {
    if (!timerInitialized) return // Don't end session until timer is initialized
    const hasTimer = Boolean(timerEndsAt || timerMinutes)
    if (!hasTimer) return
    if (timeLeft === 0 && !isTimerRunning) {
      onSessionEnd?.()
    }
  }, [timeLeft, isTimerRunning, timerMinutes, timerEndsAt, onSessionEnd, timerInitialized])

  // Screen reader announcements per minute
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      const currentMinute = Math.floor(timeLeft / 60)
      if (currentMinute !== lastMinuteAnnounced && timeLeft % 60 === 0) {
        setLastMinuteAnnounced(currentMinute)
        const announcement = document.createElement("div")
        announcement.setAttribute("role", "status")
        announcement.setAttribute("aria-live", "polite")
        announcement.className = "sr-only"
        announcement.textContent = `${currentMinute} ${currentMinute === 1 ? "minute" : "minutes"} remaining`
        document.body.appendChild(announcement)
        setTimeout(() => document.body.removeChild(announcement), 1000)
      }
    }
  }, [timeLeft, isTimerRunning, lastMinuteAnnounced])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  const startTimer = (minutes: number) => {
    if (onTimerSetMinutes) {
      onTimerSetMinutes(minutes)
      return
    }
    setTimeLeft(minutes * 60)
    setIsTimerRunning(true)
  }

  const handleAgendaSubmit = () => {
    if (agenda.trim()) {
      onAgendaChange?.(agenda.trim())
      setAgenda("")
      setIsEditingAgenda(false)
    }
  }

  const getMeterColor = () => {
    if (lockState === "hard") return "#ef4444"
    if (lockState === "soft") return "#f59e0b"
    if (focusLevel >= 70) return "#10b981"
    if (focusLevel >= 40) return "#f59e0b"
    return "#ef4444"
  }

  const getMeterGlowClass = () => {
    if (lockState === "hard") return "glow-red-pulse"
    if (lockState === "soft") return "glow-amber"
    if (focusLevel < 40) return "glow-red"
    return ""
  }

  const getStatusConfig = () => {
    switch (sessionStatus) {
      case "active":
        return { text: "LIVE", color: "#10b981", pulse: true }
      case "paused":
        return { text: "PAUSED", color: "#f59e0b", pulse: false }
      case "ended":
        return { text: "ENDED", color: "#52525b", pulse: false }
      default:
        return { text: "READY", color: "#52525b", pulse: false }
    }
  }

  const status = getStatusConfig()

  return (
    <header
      className="flex h-12 items-center justify-between gap-4 px-4 border-b border-[#1a1a1f] bg-[#0a0a0b]"
      role="banner"
      aria-label="Session header"
    >
      {/* Left: Logo + Agenda */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onMenuClick}>
          <Menu className="h-4 w-4 text-[#52525b]" />
        </Button>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Terminal className="h-4 w-4 text-[#3b82f6]" />
          <span className="font-mono text-xs font-bold text-[#fafafa]">Z3RO</span>
        </div>

        <div className="h-4 w-px bg-[#27272a] hidden md:block" />

        {pinnedAgenda && !isEditingAgenda ? (
          <button
            onClick={() => setIsEditingAgenda(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111113] border border-[#27272a] hover:border-[#3b82f6]/50 transition-colors focus-ring max-w-xs"
            aria-label={`Current agenda: ${pinnedAgenda}. Click to edit.`}
          >
            <Target className="h-3 w-3 text-[#3b82f6] shrink-0" />
            <span className="text-sm font-medium text-[#fafafa] truncate">{pinnedAgenda}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="font-mono text-xs text-[#3b82f6] shrink-0">/agenda</span>
            <Input
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAgendaSubmit()}
              placeholder="set your focus..."
              className="h-7 bg-transparent border-0 text-sm font-mono text-[#fafafa] placeholder:text-[#3f3f46] focus-visible:ring-0"
              aria-label="Agenda input"
            />
            {agenda.trim() && (
              <Button
                onClick={handleAgendaSubmit}
                size="icon"
                className="h-6 w-6 bg-[#3b82f6] hover:bg-[#2563eb]"
                aria-label="Set agenda"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Center: Timer */}
      <div
        className={`flex items-center gap-3 px-4 py-1.5 rounded-lg transition-all ${
          isTimerRunning ? "bg-[#111113] border border-[#27272a]" : ""
        }`}
        role="timer"
        aria-label={`Timer: ${formatTime(timeLeft)}`}
      >
        {lockState === "hard" && <Lock className="h-4 w-4 text-[#ef4444] pulse-critical" aria-label="Session locked" />}

        <div
          className="font-mono text-2xl font-bold tracking-tight tabular-nums"
          style={{
            color: timeLeft > 0 ? "#fafafa" : "#52525b",
            textShadow: isTimerRunning ? "0 0 20px rgba(59, 130, 246, 0.3)" : "none",
          }}
        >
          {formatTime(timeLeft)}
        </div>

        <div className="flex items-center gap-1 ml-2">
          {[25, 45, 90].map((mins) => (
            <Button
              key={mins}
              onClick={() => startTimer(mins)}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs font-mono text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#1a1a1f] focus-ring"
            >
              {mins}
            </Button>
          ))}
        </div>
      </div>

      {/* Right: Status + Focus Meter */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status.pulse ? "animate-pulse" : ""}`}
            style={{ backgroundColor: status.color }}
          />
          <span className="font-mono text-xs tracking-wider" style={{ color: status.color }}>
            {status.text}
          </span>
        </div>

        {/* Focus Meter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold tabular-nums" style={{ color: getMeterColor() }}>
            {focusLevel}%
          </span>

          <div
            className={`relative w-28 h-2 rounded-full overflow-hidden ${getMeterGlowClass()}`}
            style={{ backgroundColor: "#1a1a1f" }}
            role="progressbar"
            aria-valuenow={focusLevel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Focus level"
          >
            {/* Fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full meter-fill"
              style={{
                width: `${focusLevel}%`,
                backgroundColor: getMeterColor(),
              }}
            />
            {/* Segment markers */}
            <div className="absolute inset-0 flex">
              {[25, 50, 75].map((mark) => (
                <div
                  key={mark}
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: `${mark}%`, backgroundColor: "#0a0a0b" }}
                />
              ))}
            </div>
          </div>

          <span className="hidden sm:inline font-mono text-[10px] text-[#52525b] tracking-wider">L M H</span>
        </div>
      </div>
    </header>
  )
}
