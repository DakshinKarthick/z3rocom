"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { AppHeader } from "@/components/app-header"
import { WidgetZone, type Widget } from "@/components/widget-zone"
import { ChatStream, type Message } from "@/components/chat-stream"
import { MessageInput } from "@/components/message-input"

export type LockState = "none" | "soft" | "hard"

export default function HomePage() {
  const [lockState, setLockState] = useState<LockState>("none")
  const [distractionLevel, setDistractionLevel] = useState(15)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      author: "Assistant",
      content: "Welcome! Type / to see available commands.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])

  const [widgets, setWidgets] = useState<Widget[]>([])
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())

  const [timerMinutes, setTimerMinutes] = useState<number | null>(null)
  const [pinnedAgenda, setPinnedAgenda] = useState("")
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionData, setSessionData] = useState({
    completedTasks: [] as string[],
    incompleteTasks: [] as string[],
    decisions: [] as string[],
    blockers: [] as string[],
  })

  const messageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleGlobalKeyboard = (e: KeyboardEvent) => {
      // "/" focuses input
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault()
        messageInputRef.current?.focus()
      }
      // Esc collapses all widgets
      if (e.key === "Escape") {
        setExpandedWidgets(new Set())
        announceToScreenReader("All widgets collapsed")
      }
    }

    window.addEventListener("keydown", handleGlobalKeyboard)
    return () => window.removeEventListener("keydown", handleGlobalKeyboard)
  }, [])

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement("div")
    announcement.setAttribute("role", "status")
    announcement.setAttribute("aria-live", "polite")
    announcement.setAttribute("aria-atomic", "true")
    announcement.className = "sr-only"
    announcement.textContent = message
    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      author: "You",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleSessionEnd = useCallback(() => {
    // Collapse all widgets
    setExpandedWidgets(new Set())

    // Gather session data
    const taskWidgets = widgets.filter((w) => w.type === "tasks")
    const allTasks = taskWidgets.flatMap((w) => w.tasks || [])
    const completed = allTasks.filter((t) => t.completed).map((t) => t.text)
    const incomplete = allTasks.filter((t) => !t.completed).map((t) => t.text)

    // Create summary widget
    const summaryWidget: Widget = {
      id: `summary-${Date.now()}`,
      type: "summary",
      title: "Session Summary",
      value: `${completed.length} completed`,
      subtitle: `${incomplete.length} remaining`,
      status: "active",
      details: "Review your session outcomes",
      summary: {
        completedItems: completed,
        incompleteItems: incomplete,
        decisions: ["Focus maintained for deep work", "Task prioritization refined"],
        blockers: incomplete.length > 3 ? ["Multiple tasks remain incomplete"] : [],
        recommendations: [
          completed.length > 0
            ? "Great progress! Consider scheduling the next session."
            : "No tasks completed. Try breaking work into smaller slices.",
        ],
      },
    }

    setWidgets((prev) => [summaryWidget, ...prev])
    setExpandedWidgets(new Set([summaryWidget.id]))
    setSessionActive(false)

    announceToScreenReader("Session ended. Summary widget created with results.")

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "system",
      author: "System",
      content: `Session ended. ${completed.length} tasks completed, ${incomplete.length} remaining.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, systemMessage])
  }, [widgets])

  const handleExecuteCommand = useCallback(
    (command: string, args?: string) => {
      let confirmationMessage = ""
      let newWidget: Widget | null = null

      switch (command) {
        case "/end": {
          handleSessionEnd()
          return
        }
        case "/timer": {
          const minutes = args ? Number.parseInt(args) : 25
          setTimerMinutes(minutes)
          setSessionActive(true)
          confirmationMessage = `Timer started for ${minutes} minutes`
          newWidget = {
            id: `timer-${Date.now()}`,
            type: "timer",
            title: "Focus Timer",
            value: `${minutes}:00`,
            status: "active",
            details: `Focus session of ${minutes} minutes. Stay focused and avoid distractions.`,
          }
          announceToScreenReader(`Timer started for ${minutes} minutes`)
          break
        }
        case "/agenda": {
          if (args) {
            setPinnedAgenda(args)
            confirmationMessage = `Agenda set: "${args}"`
            newWidget = {
              id: `agenda-${Date.now()}`,
              type: "status",
              title: "Today's Agenda",
              value: args,
              status: "active",
              details: `Focus: ${args}`,
            }
            announceToScreenReader(`Agenda set to ${args}`)
          } else {
            confirmationMessage = "Please provide agenda text: /agenda <your agenda>"
          }
          break
        }
        case "/tasks": {
          confirmationMessage = "Task Slice Board created. Start tracking your work."
          newWidget = {
            id: `tasks-${Date.now()}`,
            type: "tasks",
            title: "Task Slice Board",
            value: "0 / 0",
            subtitle: "Ready to start",
            status: "idle",
            details: "Add tasks to start tracking progress. Break work into small slices.",
            tasks: [],
          }
          announceToScreenReader("Task Slice Board widget created")
          break
        }
        default:
          confirmationMessage = `Command ${command} executed.`
      }

      if (newWidget) {
        setWidgets((prev) => [...prev, newWidget])
        setExpandedWidgets((prev) => new Set([...prev, newWidget.id]))
      }

      const systemMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        author: "System",
        content: confirmationMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, systemMessage])
    },
    [handleSessionEnd],
  )

  const handleDistractionChange = useCallback(
    (level: number) => {
      setDistractionLevel(level)

      if (level >= 80) {
        if (lockState !== "hard") {
          setLockState("hard")
          announceToScreenReader("Hard lock activated. Distraction level critical. Chat disabled.")
          const lockMessage: Message = {
            id: Date.now().toString(),
            role: "system",
            author: "System",
            content: "🔒 Hard lock activated. Distraction level critical. Chat disabled until focus restored.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
          setMessages((prev) => [...prev, lockMessage])
        }
      } else if (level >= 60) {
        if (lockState !== "soft") {
          setLockState("soft")
          announceToScreenReader("Soft lock enabled. Deep-work commands temporarily disabled.")
          const warnMessage: Message = {
            id: Date.now().toString(),
            role: "system",
            author: "System",
            content: "⚠️ Soft lock enabled. Distraction level elevated. Deep-work commands temporarily disabled.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
          setMessages((prev) => [...prev, warnMessage])
        }
      } else {
        if (lockState !== "none") {
          setLockState("none")
          announceToScreenReader("Locks cleared. Focus restored.")
          const unlockMessage: Message = {
            id: Date.now().toString(),
            role: "system",
            author: "System",
            content: "✓ Locks cleared. Focus restored. All commands available.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
          setMessages((prev) => [...prev, unlockMessage])
        }
      }
    },
    [lockState, setMessages],
  )

  const toggleWidget = useCallback((id: string) => {
    setExpandedWidgets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
        announceToScreenReader("Widget collapsed")
      } else {
        newSet.add(id)
        announceToScreenReader("Widget expanded")
      }
      return newSet
    })
  }, [])

  const handleUpdateWidget = useCallback((id: string, updates: Partial<Widget>) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)))
  }, [])

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: "#0D0D0D" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:ring-2 focus:ring-[#3B82F6]"
        style={{ backgroundColor: "#1A1A1A", color: "#FFFFFF" }}
      >
        Skip to main content
      </a>

      {/* Fixed Header - 48px */}
      <AppHeader
        timerMinutes={timerMinutes}
        pinnedAgenda={pinnedAgenda}
        onAgendaChange={setPinnedAgenda}
        distractionLevel={distractionLevel}
        onDistractionChange={handleDistractionChange}
        lockState={lockState}
        onSessionEnd={handleSessionEnd}
      />

      <div id="main-content" className="flex flex-1 gap-1 overflow-hidden flex-col md:flex-row pb-12 md:pb-0">
        {/* Widget Zone - Persistent scrollable column */}
        <WidgetZone
          widgets={widgets}
          expandedWidgets={expandedWidgets}
          onToggleWidget={toggleWidget}
          onUpdateWidget={handleUpdateWidget}
        />

        {/* Chat Stream - Disposable secondary column */}
        <ChatStream messages={messages} />
      </div>

      {/* Fixed Message Input - 56px */}
      <MessageInput
        ref={messageInputRef}
        onSendMessage={handleSendMessage}
        onExecuteCommand={handleExecuteCommand}
        lockState={lockState}
      />
    </div>
  )
}
