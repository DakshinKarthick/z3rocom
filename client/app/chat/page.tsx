"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppHeader, type LockState, type SessionStatus } from "@/components/app-header"
import { WidgetZone, type Widget } from "@/components/widget-zone"
import { ChatStream, type Message, type MessageType } from "@/components/chat-stream"
import { MessageInput } from "@/components/message-input"
import { SystemStatusBar } from "@/components/system-status-bar"

interface SessionData {
  id: string
  name: string
  agenda: string
  duration: number
  creator: string
  createdAt: string
}

export default function ChatPage() {
  const router = useRouter()
  const [lockState, setLockState] = useState<LockState>("none")
  const [distractionLevel, setDistractionLevel] = useState(15)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle")
  const [lastCommand, setLastCommand] = useState("")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())

  const [timerMinutes, setTimerMinutes] = useState<number | null>(null)
  const [pinnedAgenda, setPinnedAgenda] = useState("")

  const messageInputRef = useRef<HTMLInputElement>(null)

  // Load session data
  useEffect(() => {
    const stored = sessionStorage.getItem("z3ro-session")
    if (stored) {
      const data: SessionData = JSON.parse(stored)
      setSessionData(data)
      setPinnedAgenda(data.agenda)
      setTimerMinutes(data.duration)
      setSessionStatus("active")
      setSessionStartTime(new Date())

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setMessages([
        { id: "1", type: "command-echo", author: "system", content: `/session "${data.name}"`, timestamp: now },
        { id: "2", type: "system", author: "system", content: `Agenda locked: ${data.agenda}`, timestamp: now },
        {
          id: "3",
          type: "system",
          author: "system",
          content: `Timer started: ${data.duration}m focus session`,
          timestamp: now,
        },
      ])
    } else {
      router.push("/setup")
    }
  }, [router])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        messageInputRef.current?.focus()
      }
      if (e.key === "Escape") {
        setExpandedWidgets(new Set())
      }
    }

    window.addEventListener("keydown", handleKeyboard)
    return () => window.removeEventListener("keydown", handleKeyboard)
  }, [])

  // Soft/Hard lock logic based on message count AND time
  useEffect(() => {
    if (!sessionStartTime) return

    const checkLock = () => {
      const minutesElapsed = (Date.now() - sessionStartTime.getTime()) / 60000

      // Hard lock: 10 messages OR 6 minutes
      if (messageCount >= 10 || minutesElapsed >= 6) {
        if (lockState !== "hard") {
          setLockState("hard")
          addSystemMessage("HARD_LOCK engaged. Complete agenda or /end to unlock.")
        }
        return
      }

      // Soft lock: 6 messages AND 3 minutes
      if (messageCount >= 6 && minutesElapsed >= 3) {
        if (lockState !== "soft") {
          setLockState("soft")
          addSystemMessage("SOFT_LOCK: Deep-work commands disabled. Mark a task complete to unlock.")
        }
        return
      }

      if (lockState !== "none") {
        setLockState("none")
        addSystemMessage("Lock released. All commands available.")
      }
    }

    const interval = setInterval(checkLock, 5000)
    checkLock()

    return () => clearInterval(interval)
  }, [messageCount, sessionStartTime, lockState])

  const addSystemMessage = useCallback((content: string, type: MessageType = "system") => {
    const msg: Message = {
      id: Date.now().toString(),
      type,
      author: "system",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  const handleSendMessage = (content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      type: "user",
      author: "you",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, msg])
    setMessageCount((prev) => prev + 1)
  }

  const handleSessionEnd = useCallback(() => {
    setExpandedWidgets(new Set())
    setSessionStatus("ended")

    const taskWidgets = widgets.filter((w) => w.type === "tasks")
    const allTasks = taskWidgets.flatMap((w) => w.tasks || [])
    const decisionWidgets = widgets.filter((w) => w.type === "decision")
    const blockerWidgets = widgets.filter((w) => w.type === "blocker")

    const outcomeData = {
      session: sessionData,
      completedTasks: allTasks.filter((t) => t.completed).map((t) => t.text),
      incompleteTasks: allTasks.filter((t) => !t.completed).map((t) => t.text),
      decisions: decisionWidgets.flatMap((w) => w.decisions || []).map((d) => d.text),
      blockers: blockerWidgets
        .flatMap((w) => w.blockers || [])
        .filter((b) => !b.resolved)
        .map((b) => b.text),
      endedAt: new Date().toISOString(),
    }

    sessionStorage.setItem("z3ro-outcome", JSON.stringify(outcomeData))
    router.push("/outcome")
  }, [widgets, sessionData, router])

  const handleExecuteCommand = useCallback(
    (command: string, args?: string) => {
      const fullCommand = `${command}${args ? ` ${args}` : ""}`
      setLastCommand(fullCommand)

      // Echo command immediately
      addSystemMessage(fullCommand, "command-echo")

      let newWidget: Widget | null = null

      switch (command) {
        case "/end":
          handleSessionEnd()
          return

        case "/timer": {
          const minutes = args ? Number.parseInt(args) : 25
          setTimerMinutes(minutes)
          setSessionStatus("active")
          addSystemMessage(`Timer set: ${minutes}m`)
          break
        }

        case "/agenda":
          if (args) {
            setPinnedAgenda(args)
            addSystemMessage(`Agenda updated: "${args}"`)
          }
          break

        case "/tasks":
          newWidget = {
            id: `tasks-${Date.now()}`,
            type: "tasks",
            title: "Task Slices",
            value: "0 / 0",
            subtitle: "Empty",
            status: "idle",
            tasks: [],
          }
          addSystemMessage("Task board created")
          break

        case "/decision":
          if (args) {
            const existing = widgets.find((w) => w.type === "decision")
            if (existing) {
              setWidgets((prev) =>
                prev.map((w) =>
                  w.id === existing.id
                    ? {
                        ...w,
                        decisions: [
                          {
                            id: Date.now().toString(),
                            text: args,
                            creator: "you",
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          },
                          ...(w.decisions || []),
                        ],
                        value: `${(w.decisions?.length || 0) + 1} logged`,
                      }
                    : w,
                ),
              )
              addSystemMessage(`Decision recorded: "${args}"`)
              return
            }
            newWidget = {
              id: `decision-${Date.now()}`,
              type: "decision",
              title: "Decision Log",
              value: "1 logged",
              status: "active",
              decisions: [
                {
                  id: Date.now().toString(),
                  text: args,
                  creator: "you",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
            addSystemMessage(`Decision recorded: "${args}"`)
          }
          break

        case "/blocker":
          if (args) {
            const existing = widgets.find((w) => w.type === "blocker")
            if (existing) {
              const updatedBlockers = [
                ...(existing.blockers || []),
                {
                  id: Date.now().toString(),
                  text: args,
                  resolved: false,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]
              setWidgets((prev) =>
                prev.map((w) =>
                  w.id === existing.id
                    ? {
                        ...w,
                        blockers: updatedBlockers,
                        value: `${updatedBlockers.filter((b) => !b.resolved).length} unresolved`,
                        status: "warning",
                      }
                    : w,
                ),
              )
              addSystemMessage(`Blocker flagged: "${args}"`)
              return
            }
            newWidget = {
              id: `blocker-${Date.now()}`,
              type: "blocker",
              title: "Blockers",
              value: "1 unresolved",
              status: "warning",
              blockers: [
                {
                  id: Date.now().toString(),
                  text: args,
                  resolved: false,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
            addSystemMessage(`Blocker flagged: "${args}"`)
          }
          break

        case "/code":
          newWidget = {
            id: `code-${Date.now()}`,
            type: "code",
            title: "Code Focus",
            value: "Ready",
            status: "active",
            codeContent: "// Focus snippet\n",
            codeLocked: false,
          }
          addSystemMessage("Code snippet opened")
          break

        case "/progress":
          newWidget = {
            id: `progress-${Date.now()}`,
            type: "progress",
            title: "Progress Check",
            value: "Collecting",
            status: "active",
            progressResponses: [],
          }
          addSystemMessage("Progress check initiated")
          break

        case "/next": {
          const unresolvedBlockers = widgets
            .filter((w) => w.type === "blocker")
            .flatMap((w) => w.blockers || [])
            .filter((b) => !b.resolved)

          newWidget = {
            id: `next-${Date.now()}`,
            type: "next",
            title: "Next Session",
            value: "Planning",
            status: "idle",
            nextSession: {
              goal: "",
              duration: 45,
              carryOverBlockers: unresolvedBlockers.map((b) => ({ ...b, selected: false })),
            },
          }
          addSystemMessage("Session planner opened")
          break
        }

        default:
          addSystemMessage(`Unknown command: ${command}`)
      }

      if (newWidget) {
        setWidgets((prev) => [...prev, newWidget])
        setExpandedWidgets((prev) => new Set([...prev, newWidget.id]))
      }
    },
    [handleSessionEnd, widgets, addSystemMessage],
  )

  const handleDistractionChange = useCallback((level: number) => {
    setDistractionLevel(level)
  }, [])

  const toggleWidget = useCallback((id: string) => {
    setExpandedWidgets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const handleUpdateWidget = useCallback(
    (id: string, updates: Partial<Widget>) => {
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)))

      // Check if task completion should unlock
      if (updates.tasks) {
        const completedCount = updates.tasks.filter((t) => t.completed).length
        if (completedCount > 0 && lockState === "soft") {
          setLockState("none")
          setMessageCount(0) // Reset message count on task completion
          addSystemMessage("Task completed. Lock released.")
        }
      }
    },
    [lockState, addSystemMessage],
  )

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
          <span className="font-mono text-sm text-[#52525b]">Loading chat...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0b] grid-bg">
      <div className="scanline-overlay" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-[#111113] focus:text-[#fafafa] focus:rounded focus-ring"
      >
        Skip to main content
      </a>

      <AppHeader
        timerMinutes={timerMinutes}
        pinnedAgenda={pinnedAgenda}
        onAgendaChange={setPinnedAgenda}
        distractionLevel={distractionLevel}
        onDistractionChange={handleDistractionChange}
        lockState={lockState}
        onSessionEnd={handleSessionEnd}
        sessionStatus={sessionStatus}
        lastCommand={lastCommand}
      />

      <div id="main-content" className="flex flex-1 overflow-hidden">
        <WidgetZone
          widgets={widgets}
          expandedWidgets={expandedWidgets}
          onToggleWidget={toggleWidget}
          onUpdateWidget={handleUpdateWidget}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Main content area - intentionally empty to emphasize widgets */}
            <div className="flex-1 flex items-center justify-center">
              {widgets.length === 0 && (
                <div className="text-center max-w-sm">
                  <div className="w-12 h-12 rounded-xl bg-[#111113] border border-[#27272a] flex items-center justify-center mx-auto mb-4">
                    <span className="font-mono text-2xl text-[#3b82f6]">/</span>
                  </div>
                  <p className="text-sm text-[#52525b] mb-2">No widgets active</p>
                  <p className="font-mono text-xs text-[#3f3f46]">
                    Type <kbd className="px-1.5 py-0.5 rounded bg-[#111113] border border-[#27272a] mx-1">/</kbd> to
                    open commands
                  </p>
                </div>
              )}
            </div>
            <ChatStream messages={messages} />
          </div>
        </div>
      </div>

      <SystemStatusBar
        sessionStatus={sessionStatus}
        timeRemaining={timeRemaining}
        lastCommand={lastCommand}
        lockState={lockState}
      />

      <MessageInput
        ref={messageInputRef}
        onSendMessage={handleSendMessage}
        onExecuteCommand={handleExecuteCommand}
        lockState={lockState}
      />
    </div>
  )
}
