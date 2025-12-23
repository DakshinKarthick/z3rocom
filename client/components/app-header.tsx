"use client"

import { useState, useEffect } from "react"
import { Check, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LockState } from "@/app/page"

interface AppHeaderProps {
  timerMinutes?: number | null
  pinnedAgenda?: string
  onAgendaChange?: (agenda: string) => void
  distractionLevel?: number
  onDistractionChange?: (level: number) => void
  lockState?: LockState
  onSessionEnd?: () => void // Add session end callback
}

export function AppHeader({
  timerMinutes,
  pinnedAgenda = "",
  onAgendaChange,
  distractionLevel = 15,
  onDistractionChange,
  lockState = "none",
  onSessionEnd, // Destructure new prop
}: AppHeaderProps) {
  const [agenda, setAgenda] = useState("")
  const [isEditingAgenda, setIsEditingAgenda] = useState(false)

  const [timeLeft, setTimeLeft] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  useEffect(() => {
    if (timerMinutes) {
      setTimeLeft(timerMinutes * 60)
      setIsTimerRunning(true)
    }
  }, [timerMinutes])

  useEffect(() => {
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
  }, [isTimerRunning, timeLeft])

  useEffect(() => {
    if (timeLeft === 0 && !isTimerRunning && timerMinutes) {
      // Timer just ended
      onSessionEnd?.()
    }
  }, [timeLeft, isTimerRunning, timerMinutes, onSessionEnd])

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0 && timeLeft % 60 === 0) {
      const minutes = Math.floor(timeLeft / 60)
      const announcement = document.createElement("div")
      announcement.setAttribute("role", "status")
      announcement.setAttribute("aria-live", "polite")
      announcement.className = "sr-only"
      announcement.textContent = `${minutes} ${minutes === 1 ? "minute" : "minutes"} remaining`
      document.body.appendChild(announcement)
      setTimeout(() => document.body.removeChild(announcement), 1000)
    }
  }, [timeLeft, isTimerRunning])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startTimer = (minutes: number) => {
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
    if (lockState === "hard") return "#EF4444"
    if (lockState === "soft") return "#F59E0B"
    if (distractionLevel < 30) return "#10B981"
    if (distractionLevel < 60) return "#F59E0B"
    return "#EF4444"
  }

  return (
    <header
      className="flex h-12 items-center justify-between gap-1 px-4"
      style={{ backgroundColor: "#1A1A1A" }}
      role="banner"
      aria-label="Application header with agenda, timer, and distraction meter"
    >
      {/* Left: Agenda */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {pinnedAgenda && !isEditingAgenda ? (
          <button
            onClick={() => setIsEditingAgenda(true)}
            className="text-base font-semibold truncate hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded px-1 -ml-1"
            style={{ color: "#FFFFFF" }}
            aria-label={`Current agenda: ${pinnedAgenda}. Click to edit.`}
          >
            {pinnedAgenda}
          </button>
        ) : (
          <div className="flex items-center gap-1 w-full max-w-xs">
            <Input
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAgendaSubmit()}
              placeholder="Set agenda..."
              className="h-8 bg-[#262626] border-0 text-base font-semibold placeholder:text-[#52525B] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              style={{ color: "#FFFFFF" }}
              aria-label="Agenda input"
            />
            {agenda.trim() && (
              <Button
                onClick={handleAgendaSubmit}
                size="icon"
                className="h-8 w-8 bg-[#3B82F6] hover:bg-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                aria-label="Submit agenda"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Center: Timer */}
      <div className="flex flex-col items-center gap-1" role="timer" aria-label={`Timer: ${formatTime(timeLeft)}`}>
        <div className="flex items-center gap-2">
          <div
            className="font-mono text-2xl font-bold leading-none"
            style={{ color: timeLeft > 0 ? "#FFFFFF" : "#52525B" }}
          >
            {formatTime(timeLeft)}
          </div>
          {lockState === "hard" && <Lock className="h-4 w-4" style={{ color: "#EF4444" }} />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => startTimer(25)}
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-xs hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            style={{ color: "#A1A1AA" }}
          >
            25
          </Button>
          <Button
            onClick={() => startTimer(45)}
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-xs hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            style={{ color: "#A1A1AA" }}
          >
            45
          </Button>
          <Button
            onClick={() => startTimer(90)}
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-xs hover:bg-[#262626] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            style={{ color: "#A1A1AA" }}
          >
            90
          </Button>
        </div>
      </div>

      {/* Right: Distraction Meter */}
      <div
        className="flex items-center gap-2 flex-1 justify-end"
        role="region"
        aria-label={`Distraction level: ${distractionLevel}%`}
      >
        <span className="text-xs font-medium" style={{ color: "#A1A1AA" }}>
          Distraction
        </span>
        <div
          className="relative w-24 h-1 rounded-full overflow-hidden"
          style={{
            backgroundColor: "#262626",
            boxShadow: lockState === "soft" ? "0 0 8px rgba(245, 158, 11, 0.5)" : "none",
          }}
        >
          <div
            className="absolute top-0 left-0 h-full transition-all duration-300"
            style={{
              width: `${distractionLevel}%`,
              backgroundColor: getMeterColor(),
            }}
          />
        </div>
        <span className="text-xs font-mono tabular-nums" style={{ color: "#FFFFFF" }}>
          {distractionLevel}%
        </span>
        <div className="flex gap-1 ml-2">
          <Button
            onClick={() => onDistractionChange?.(30)}
            size="sm"
            variant="ghost"
            className="h-5 px-1 text-xs"
            style={{ color: "#52525B" }}
          >
            Low
          </Button>
          <Button
            onClick={() => onDistractionChange?.(65)}
            size="sm"
            variant="ghost"
            className="h-5 px-1 text-xs"
            style={{ color: "#52525B" }}
          >
            Med
          </Button>
          <Button
            onClick={() => onDistractionChange?.(85)}
            size="sm"
            variant="ghost"
            className="h-5 px-1 text-xs"
            style={{ color: "#52525B" }}
          >
            High
          </Button>
        </div>
      </div>
    </header>
  )
}
