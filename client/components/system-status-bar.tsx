"use client"

import { Terminal, Wifi, Copy, Check } from "lucide-react"
import { useState } from "react"
import type { LockState, SessionStatus } from "@/components/app-header"

interface SystemStatusBarProps {
  sessionStatus: SessionStatus
  timeRemaining: string
  lastCommand: string
  lockState: LockState
  sessionId?: string
}

export function SystemStatusBar({ sessionStatus, timeRemaining, lastCommand, lockState, sessionId }: SystemStatusBarProps) {
  const [copied, setCopied] = useState(false)

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getStatusConfig = () => {
    switch (sessionStatus) {
      case "active":
        return { text: "ACTIVE", color: "#10b981" }
      case "paused":
        return { text: "PAUSED", color: "#f59e0b" }
      case "ended":
        return { text: "ENDED", color: "#52525b" }
      default:
        return { text: "IDLE", color: "#52525b" }
    }
  }

  const getLockConfig = () => {
    switch (lockState) {
      case "soft":
        return { text: "SOFT_LOCK", color: "#f59e0b" }
      default:
        return null
    }
  }

  const status = getStatusConfig()
  const lock = getLockConfig()

  return (
    <div
      className="status-bar flex items-center justify-between h-6 px-4 border-t border-[#1a1a1f] bg-[#0a0a0b]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-[#10b981]" />
          <span className="text-[#3f3f46]">LOCAL</span>
        </div>

        {/* Session status */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${sessionStatus === "active" ? "animate-pulse" : ""}`}
            style={{ backgroundColor: status.color }}
          />
          <span style={{ color: status.color }}>{status.text}</span>
        </div>

        {/* Time remaining */}
        {timeRemaining && <span className="text-[#a1a1aa]">T-{timeRemaining}</span>}

        {/* Session ID with copy button */}
        {sessionId && (
          <button
            onClick={copySessionId}
            className="flex items-center gap-1.5 hover:text-[#3b82f6] transition-colors group"
            title="Copy Session ID for testing"
          >
            {copied ? (
              <Check className="h-3 w-3 text-[#10b981]" />
            ) : (
              <Copy className="h-3 w-3 text-[#52525b] group-hover:text-[#3b82f6]" />
            )}
            <span className="text-[#52525b] text-xs group-hover:text-[#3b82f6]">
              {copied ? "Copied!" : "Copy ID"}
            </span>
          </button>
        )}

        {/* Lock status */}
        {lock && (
          <span className={lockState === "hard" ? "pulse-critical" : ""} style={{ color: lock.color }}>
            [{lock.text}]
          </span>
        )}
      </div>

      {/* Last command echo */}
      <div className="flex items-center gap-2">
        <Terminal className="h-3 w-3 text-[#3f3f46]" />
        <span className="text-[#52525b] truncate max-w-xs">{lastCommand || "awaiting command..."}</span>
      </div>
    </div>
  )
}
