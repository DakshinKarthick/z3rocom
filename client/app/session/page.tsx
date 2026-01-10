"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AppHeader, type LockState, type SessionStatus } from "@/components/app-header"
import { WidgetZone, type Widget, type Task, type Decision, type Issue } from "@/components/widget-zone"
import { ChatStream, type Message, type MessageType } from "@/components/chat-stream"
import { RoomSettings } from "@/components/room-settings"
import { MessageInput } from "@/components/message-input"
import { SystemStatusBar } from "@/components/system-status-bar"
import type { DbMessage, DbSession } from "@/lib/supabase/model"
import {
  getSessionById,
  insertMessage,
  joinSession,
  listMessages,
  setAgenda,
  setTimerEndsAt,
  subscribeToMessages,
  subscribeToSession,
  analyzeMessagesFocus,
  updateSessionFocusLevel,
} from "@/lib/supabase/chat"
import { 
  createWidget, 
  addTaskItem, 
  updateTaskItem, 
  addDecision, 
  addIssue,
  updateIssue,
  upsertCodeSnippet,
  getWidgetsBySession,
  subscribeToWidgets,
  subscribeToTaskItems,
  subscribeToDecisions,
  subscribeToIssues,
  getTaskItems,
  getDecisions,
  getIssues
} from "@/lib/supabase/widgets"
import { toTimeLabel } from "@/lib/supabase/helpers"
import { summarizeSession } from "@/lib/summarizer"
import { extractSessionActions, type ActionItem } from "@/lib/action-extractor"

interface SessionData {
  id: string
  code?: string
  name: string
  agenda: string
  duration: number
  creator: string
  createdAt: string
}

export default function SessionPage() {
  const router = useRouter()
  const [lockState, setLockState] = useState<LockState>("none")
  const [focusLevel, setFocusLevel] = useState(100) // 0-100, from API focus_level
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle")
  const [lastCommand, setLastCommand] = useState("")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [displayName, setDisplayName] = useState("You")
  const [isCreator, setIsCreator] = useState(false)
  const [creatorName, setCreatorName] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set())
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('z3ro-settings-collapsed')
      return saved === 'true'
    }
    return true
  })

  const [timerMinutes, setTimerMinutes] = useState<number | null>(null)
  const [timerEndsAt, setTimerEndsAtState] = useState<string | null>(null)
  const [pinnedAgenda, setPinnedAgenda] = useState("")

  const messageInputRef = useRef<HTMLInputElement>(null)
  const seenMessageIdsRef = useRef<Set<string>>(new Set())

  const dbToUiMessage = useCallback((m: DbMessage): Message => {
    const msgCreatorName = m.author_name === creatorName
    return {
      id: m.id,
      type: m.kind as MessageType,
      author: m.author_name,
      content: m.content,
      timestamp: toTimeLabel(m.created_at),
      isCreator: msgCreatorName,
    }
  }, [creatorName])

  const addDbMessage = useCallback(
    (m: DbMessage) => {
      // Check ID-based deduplication first
      if (seenMessageIdsRef.current.has(m.id)) return
      
      // Also check content+timestamp within 2s window to catch race conditions
      const msgTime = new Date(m.created_at).getTime()
      const isDuplicate = messages.slice(-20).some(
        (existing) => 
          existing.content === m.content && 
          Math.abs(new Date(existing.timestamp).getTime() - msgTime) < 2000
      )
      
      if (isDuplicate) return
      
      seenMessageIdsRef.current.add(m.id)
      setMessages((prev) => [...prev, dbToUiMessage(m)])
    },
    [dbToUiMessage, messages],
  )

  // Load session data
  useEffect(() => {
    const stored = sessionStorage.getItem("z3ro-session")
    if (!stored) {
      router.push("/setup")
      return
    }

    const storedDisplayName = sessionStorage.getItem("z3ro-display-name") || "You"
    setDisplayName(storedDisplayName)

    let cleanupMessages = () => {}
    let cleanupSession = () => {}
    let cleanupWidgets = () => {}
    let cleanupTaskSubs: (() => void)[] = []
    let cleanupDecisionSubs: (() => void)[] = []
    let cleanupIssueSubs: (() => void)[] = []
    let cancelled = false
    let subscribed = false

    ;(async () => {
      try {
        const local: SessionData = JSON.parse(stored)
        const creatorNameFromStorage = (JSON.parse(stored) as any).creatorName
        const isCreatorFlag = sessionStorage.getItem("z3ro-is-creator") === "true"
        
        setIsCreator(isCreatorFlag)
        if (creatorNameFromStorage) {
          setCreatorName(creatorNameFromStorage)
        }

        const session: DbSession = await getSessionById(local.id)
        if (cancelled) return

        setSessionData({
          id: session.id,
          code: session.code,
          name: session.name,
          agenda: session.agenda,
          duration: session.duration_minutes,
          creator: session.created_by,
          createdAt: session.created_at,
        })

        setPinnedAgenda(session.agenda)
        setTimerMinutes(session.duration_minutes)
        setTimerEndsAtState(session.timer_ends_at)
        // Set focus level directly (0-100)
        setFocusLevel(session.focus_level ?? 100)
        setSessionStatus("active")
        setSessionStartTime(new Date(session.created_at))

        await joinSession({ sessionId: session.id, displayName: storedDisplayName })

        const dbMessages = await listMessages(session.id)
        if (cancelled) return

        seenMessageIdsRef.current = new Set(dbMessages.map((m) => m.id))
        setMessages(dbMessages.map(dbToUiMessage))

        // Load widgets from database
        try {
          const widgetIndex = await getWidgetsBySession(session.id)
          if (!cancelled && widgetIndex.length > 0) {
            // Load all widgets with their child data
            const loadedWidgets = await Promise.all(
              widgetIndex.map(async (w: any) => {
                const baseWidget = {
                  id: w.id,
                  type: w.widget_type as Widget['type'],
                  title: w.title,
                  value: "0",
                  status: "idle" as const,
                }

                // Load child data based on widget type
                try {
                  if (w.widget_type === 'tasks') {
                    const tasks = await getTaskItems(w.id)
                    const completed = tasks.filter(t => t.completed).length
                    return {
                      ...baseWidget,
                      tasks: tasks.map(t => ({
                        id: t.id,
                        text: t.text,
                        completed: t.completed,
                      })),
                      value: `${completed} / ${tasks.length}`,
                      subtitle: tasks.length === 0 ? "Empty" : `${tasks.length - completed} remaining`,
                    }
                  } else if (w.widget_type === 'decision') {
                    const decisions = await getDecisions(w.id)
                    return {
                      ...baseWidget,
                      decisions: decisions.map(d => ({
                        id: d.id,
                        text: d.text,
                        creator: d.creator_id,
                        timestamp: new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      })),
                      value: `${decisions.length} logged`,
                      status: "active" as const,
                    }
                  } else if (w.widget_type === 'issues') {
                    const issues = await getIssues(w.id)
                    const unresolved = issues.filter(i => !i.resolved).length
                    return {
                      ...baseWidget,
                      issues: issues.map(i => ({
                        id: i.id,
                        text: i.text,
                        resolved: i.resolved,
                        timestamp: new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      })),
                      value: `${unresolved} unresolved`,
                      status: unresolved > 0 ? "warning" as const : "idle" as const,
                    }
                  }
                } catch (err) {
                  console.error(`Failed to load data for widget ${w.id}:`, err)
                }

                return baseWidget
              })
            )
            setWidgets(loadedWidgets)
            
            // Subscribe to child data for loaded widgets
            console.log('[Session] Setting up subscriptions for widgets:', loadedWidgets.map(w => ({ id: w.id, type: w.type })))
            loadedWidgets.forEach(widget => {
              if (!widget.id) {
                console.error('[Session] Widget missing ID:', widget)
                return
              }
              
              if (widget.type === 'tasks') {
                const cleanup = subscribeToTaskItems(widget.id, (payload) => {
                  if (!cancelled) {
                    console.log('[Session] Task change:', payload)
                    setWidgets(prev => prev.map(w => {
                      if (w.id === widget.id) {
                        const tasks = w.tasks || []
                        let updatedTasks = [...tasks]
                        
                        if (payload.eventType === 'INSERT') {
                          const newTask = payload.new
                          if (!updatedTasks.some(t => t.id === newTask.id)) {
                            updatedTasks.push({
                              id: newTask.id,
                              text: newTask.text,
                              completed: newTask.completed,
                            })
                          }
                        } else if (payload.eventType === 'UPDATE') {
                          updatedTasks = updatedTasks.map(t =>
                            t.id === payload.new.id
                              ? { id: payload.new.id, text: payload.new.text, completed: payload.new.completed }
                              : t
                          )
                        } else if (payload.eventType === 'DELETE') {
                          updatedTasks = updatedTasks.filter(t => t.id !== payload.old.id)
                        }
                        
                        const completed = updatedTasks.filter(t => t.completed).length
                        return {
                          ...w,
                          tasks: updatedTasks,
                          value: `${completed} / ${updatedTasks.length}`,
                          subtitle: updatedTasks.length === 0 ? "Empty" : `${updatedTasks.length - completed} remaining`,
                        }
                      }
                      return w
                    }))
                  }
                })
                cleanupTaskSubs.push(cleanup)
              } else if (widget.type === 'decision') {
                const cleanup = subscribeToDecisions(widget.id, (payload) => {
                  if (!cancelled) {
                    console.log('[Session] Decision change:', payload)
                    setWidgets(prev => prev.map(w => {
                      if (w.id === widget.id) {
                        const decisions = w.decisions || []
                        if (payload.eventType === 'INSERT' && !decisions.some(d => d.id === payload.new.id)) {
                          const updatedDecisions = [{
                            id: payload.new.id,
                            text: payload.new.text,
                            creator: payload.new.creator_id,
                            timestamp: new Date(payload.new.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          }, ...decisions]
                          return { ...w, decisions: updatedDecisions, value: `${updatedDecisions.length} logged` }
                        }
                      }
                      return w
                    }))
                  }
                })
                cleanupDecisionSubs.push(cleanup)
              } else if (widget.type === 'issues') {
                const cleanup = subscribeToIssues(widget.id, (payload) => {
                  if (!cancelled) {
                    console.log('[Session] Issue change:', payload)
                    setWidgets(prev => prev.map(w => {
                      if (w.id === widget.id) {
                        const issues = w.issues || []
                        let updatedIssues = [...issues]
                        
                        if (payload.eventType === 'INSERT') {
                          if (!updatedIssues.some(i => i.id === payload.new.id)) {
                            updatedIssues.push({
                              id: payload.new.id,
                              text: payload.new.text,
                              resolved: payload.new.resolved,
                              timestamp: new Date(payload.new.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            })
                          }
                        } else if (payload.eventType === 'UPDATE') {
                          updatedIssues = updatedIssues.map(i =>
                            i.id === payload.new.id ? { ...i, resolved: payload.new.resolved } : i
                          )
                        } else if (payload.eventType === 'DELETE') {
                          updatedIssues = updatedIssues.filter(i => i.id !== payload.old.id)
                        }
                        
                        const unresolved = updatedIssues.filter(i => !i.resolved).length
                        return {
                          ...w,
                          issues: updatedIssues,
                          value: `${unresolved} unresolved`,
                          status: unresolved > 0 ? "warning" as const : "idle" as const,
                        }
                      }
                      return w
                    }))
                  }
                })
                cleanupIssueSubs.push(cleanup)
              }
            })
          }
        } catch (error) {
          console.error('Failed to load widgets:', error)
        }

        // Only subscribe once
        if (!subscribed && !cancelled) {
          subscribed = true
          cleanupMessages = subscribeToMessages(session.id, (msg) => {
            if (!cancelled) addDbMessage(msg)
          })
          cleanupSession = subscribeToSession(session.id, (next) => {
            if (!cancelled) {
              setPinnedAgenda(next.agenda)
              setTimerEndsAtState(next.timer_ends_at)
              if (next.focus_level !== undefined) {
                // Set focus level directly (0-100)
                setFocusLevel(next.focus_level)
              }
            }
          })
          // Subscribe to widget changes - broadcast to all users
          cleanupWidgets = subscribeToWidgets(session.id, (payload) => {
            if (!cancelled) {
              console.log('[Session] Widget change detected:', payload)
              // When a new widget is created, add it to the widgets list
              if (payload.eventType === 'INSERT') {
                const newWidget = payload.new
                const widgetId = newWidget.id
                
                if (!widgetId) {
                  console.error('[Session] Widget missing ID:', newWidget)
                  return
                }
                
                setWidgets((prev) => {
                  // Check if widget already exists
                  if (prev.some(w => w.id === widgetId)) return prev
                  const baseWidget = {
                    id: widgetId,
                    type: newWidget.widget_type as Widget['type'],
                    title: newWidget.title || 'New Widget',
                    value: "0",
                    status: "idle" as const,
                  }
                  
                  // Subscribe to child data for this widget
                  if (newWidget.widget_type === 'tasks') {
                    const cleanup = subscribeToTaskItems(widgetId, (taskPayload) => {
                      if (!cancelled) {
                        console.log('[Session] Task change detected:', taskPayload)
                        setWidgets(prev => prev.map(w => {
                          if (w.id === widgetId) {
                            const tasks = w.tasks || []
                            let updatedTasks = [...tasks]
                            
                            if (taskPayload.eventType === 'INSERT') {
                              const newTask = taskPayload.new
                              if (!updatedTasks.some(t => t.id === newTask.id)) {
                                updatedTasks.push({
                                  id: newTask.id,
                                  text: newTask.text,
                                  completed: newTask.completed,
                                })
                              }
                            } else if (taskPayload.eventType === 'UPDATE') {
                              updatedTasks = updatedTasks.map(t =>
                                t.id === taskPayload.new.id
                                  ? { id: taskPayload.new.id, text: taskPayload.new.text, completed: taskPayload.new.completed }
                                  : t
                              )
                            } else if (taskPayload.eventType === 'DELETE') {
                              updatedTasks = updatedTasks.filter(t => t.id !== taskPayload.old.id)
                            }
                            
                            const completed = updatedTasks.filter(t => t.completed).length
                            return {
                              ...w,
                              tasks: updatedTasks,
                              value: `${completed} / ${updatedTasks.length}`,
                              subtitle: updatedTasks.length === 0 ? "Empty" : `${updatedTasks.length - completed} remaining`,
                            }
                          }
                          return w
                        }))
                      }
                    })
                    cleanupTaskSubs.push(cleanup)
                  } else if (newWidget.widget_type === 'decision') {
                    const cleanup = subscribeToDecisions(widgetId, (decisionPayload) => {
                      if (!cancelled) {
                        console.log('[Session] Decision change detected:', decisionPayload)
                        setWidgets(prev => prev.map(w => {
                          if (w.id === widgetId) {
                            const decisions = w.decisions || []
                            let updatedDecisions = [...decisions]
                            
                            if (decisionPayload.eventType === 'INSERT') {
                              const newDecision = decisionPayload.new
                              if (!updatedDecisions.some(d => d.id === newDecision.id)) {
                                updatedDecisions.unshift({
                                  id: newDecision.id,
                                  text: newDecision.text,
                                  creator: newDecision.creator_id,
                                  timestamp: new Date(newDecision.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                })
                              }
                            }
                            
                            return {
                              ...w,
                              decisions: updatedDecisions,
                              value: `${updatedDecisions.length} logged`,
                              status: "active" as const,
                            }
                          }
                          return w
                        }))
                      }
                    })
                    cleanupDecisionSubs.push(cleanup)
                  } else if (newWidget.widget_type === 'issues') {
                    const cleanup = subscribeToIssues(widgetId, (issuePayload) => {
                      if (!cancelled) {
                        console.log('[Session] Issue change detected:', issuePayload)
                        setWidgets(prev => prev.map(w => {
                          if (w.id === widgetId) {
                            const issues = w.issues || []
                            let updatedIssues = [...issues]
                            
                            if (issuePayload.eventType === 'INSERT') {
                              const newIssue = issuePayload.new
                              if (!updatedIssues.some(i => i.id === newIssue.id)) {
                                updatedIssues.push({
                                  id: newIssue.id,
                                  text: newIssue.text,
                                  resolved: newIssue.resolved,
                                  timestamp: new Date(newIssue.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                })
                              }
                            } else if (issuePayload.eventType === 'UPDATE') {
                              updatedIssues = updatedIssues.map(i =>
                                i.id === issuePayload.new.id
                                  ? { ...i, resolved: issuePayload.new.resolved }
                                  : i
                              )
                            } else if (issuePayload.eventType === 'DELETE') {
                              updatedIssues = updatedIssues.filter(i => i.id !== issuePayload.old.id)
                            }
                            
                            const unresolved = updatedIssues.filter(i => !i.resolved).length
                            return {
                              ...w,
                              issues: updatedIssues,
                              value: `${unresolved} unresolved`,
                              status: unresolved > 0 ? "warning" as const : "idle" as const,
                            }
                          }
                          return w
                        }))
                      }
                    })
                    cleanupIssueSubs.push(cleanup)
                  }
                  
                  return [...prev, baseWidget]
                })
              }
            }
          })
        }
      } catch (e) {
        console.error("Session load error:", e)
        router.push("/setup")
      }
    })()

    return () => {
      cancelled = true
      cleanupMessages()
      cleanupSession()
      cleanupWidgets()
      cleanupTaskSubs.forEach(cleanup => cleanup())
      cleanupDecisionSubs.forEach(cleanup => cleanup())
      cleanupIssueSubs.forEach(cleanup => cleanup())
      // Clear seen messages to prevent memory leak
      seenMessageIdsRef.current.clear()
    }
  }, [router, dbToUiMessage])

  useEffect(() => {
    setMessageCount(messages.filter((m) => m.type === "user").length)
  }, [messages])

  // Update time remaining display
  useEffect(() => {
    if (!timerEndsAt) {
      setTimeRemaining("")
      return
    }

    const updateTime = () => {
      const ms = new Date(timerEndsAt).getTime() - Date.now()
      if (ms <= 0) {
        setTimeRemaining("00:00")
        return
      }
      
      const totalSeconds = Math.floor(ms / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      setTimeRemaining(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timerEndsAt])

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
      author: isCreator && creatorName ? creatorName : "system",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCreator: isCreator,
    }
    setMessages((prev) => [...prev, msg])
  }, [isCreator, creatorName])

  const handleSendMessage = async (content: string) => {
    if (!sessionData) return

    const id = crypto.randomUUID()
    const isCreatorMsg = isCreator && creatorName === displayName
    const optimistic: Message = {
      id,
      type: "user",
      author: displayName,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCreator: isCreatorMsg,
    }

    seenMessageIdsRef.current.add(id)
    setMessages((prev) => [...prev, optimistic])

    try {
      await insertMessage({
        id,
        sessionId: sessionData.id,
        kind: "user",
        content,
        authorName: displayName,
      })

      // Analyze focus level after successful message send
      // Get last 10 user messages (newest first) for analysis
      const recentUserMessages = [...messages, optimistic]
        .filter((m) => m.type === "user")
        .slice(-10)
        .reverse()
        .map((m) => m.content)

      if (recentUserMessages.length > 0) {
        // Run analysis in background (don't block UI)
        analyzeMessagesFocus(recentUserMessages)
          .then(async (result) => {
            console.log("[Focus] Analysis result:", result)
            
            // Check if we got a valid focus_level (even with fallback, it has a value)
            if (typeof result.focus_level === "number") {
              // Update local state immediately for responsive UI
              setFocusLevel(result.focus_level)
              console.log("[Focus] Updated focus level:", result.focus_level, result.fallback ? "(fallback)" : "")
              
              // Only update database if it's not a fallback result
              if (!result.fallback) {
                try {
                  await updateSessionFocusLevel(sessionData.id, result.focus_level)
                  console.log("[Focus] Database updated successfully")
                } catch (dbErr) {
                  // RLS may block non-creators, but local update still works
                  console.log("[Focus] Database update skipped (RLS):", dbErr)
                }
              }
            } else {
              console.log("[Focus] No valid focus_level in result")
            }
          })
          .catch((err) => {
            console.error("[Focus] Analysis error:", err)
          })
      }
    } catch (error) {
      console.error("Send message error:", error)
      addSystemMessage("Failed to send message. Check your connection.")
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== id))
      seenMessageIdsRef.current.delete(id)
    }
  }

  const handleSessionEnd = useCallback(async () => {
    setExpandedWidgets(new Set())
    setSessionStatus("ended")

    const taskWidgets = widgets.filter((w) => w.type === "tasks")
    const allTasks = taskWidgets.flatMap((w) => w.tasks || [])
    const decisionWidgets = widgets.filter((w) => w.type === "decision")
    const issueWidgets = widgets.filter((w) => w.type === "issues")

    // Extract message content for summarization
    const messageContents = messages
      .filter((m) => m.type === "user" || m.type === "creator")
      .map((m) => `${m.author}: ${m.content}`)

    const outcomeData: {
      session: SessionData | null
      completedTasks: string[]
      incompleteTasks: string[]
      decisions: string[]
      issues: string[]
      endedAt: string
      summary?: string
      aiActionItems?: ActionItem[]
      aiDecisions?: string[]
      aiOpenQuestions?: string[]
    } = {
      session: sessionData,
      completedTasks: allTasks.filter((t) => t.completed).map((t) => t.text),
      incompleteTasks: allTasks.filter((t) => !t.completed).map((t) => t.text),
      decisions: decisionWidgets.flatMap((w) => w.decisions || []).map((d) => d.text),
      issues: issueWidgets
        .flatMap((w) => w.issues || [])
        .filter((b) => !b.resolved)
        .map((b) => b.text),
      endedAt: new Date().toISOString(),
    }

    // Generate summary and extract actions in parallel
    try {
      if (messageContents.length > 0) {
        const [summaryResult, actionsResult] = await Promise.all([
          summarizeSession(messageContents, 5),
          extractSessionActions(messageContents, sessionData?.name, sessionData?.agenda),
        ])
        
        if (summaryResult.success && summaryResult.summary) {
          outcomeData.summary = summaryResult.summary
        }
        
        if (actionsResult.success) {
          outcomeData.aiActionItems = actionsResult.actionItems
          outcomeData.aiDecisions = actionsResult.decisions
          outcomeData.aiOpenQuestions = actionsResult.openQuestions
        }
      }
    } catch (error) {
      console.error("AI analysis failed:", error)
      // Continue without AI-generated content
    }

    // Store and navigate after summary is complete
    sessionStorage.setItem("z3ro-outcome", JSON.stringify(outcomeData))
    router.push("/outcome")
  }, [widgets, sessionData, router, messages])

  const handleExecuteCommand = useCallback(
    async (command: string, args?: string) => {
      if (!sessionData) return

      const fullCommand = `${command}${args ? ` ${args}` : ""}`
      setLastCommand(fullCommand)

      // Echo command immediately (and persist so others see it)
      const echoId = crypto.randomUUID()
      const echo: Message = {
        id: echoId,
        type: "command-echo",
        author: "system",
        content: fullCommand,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      seenMessageIdsRef.current.add(echoId)
      setMessages((prev) => [...prev, echo])

      try {
        await insertMessage({
          id: echoId,
          sessionId: sessionData.id,
          kind: "command-echo",
          content: fullCommand,
          authorName: "system",
        })
      } catch {
        // Non-fatal
      }

      let newWidget: Widget | null = null

      switch (command) {
        case "/end":
          handleSessionEnd()
          return

        case "/timer": {
          const parsed = args ? Number.parseInt(args, 10) : 25
          const minutes = Number.isFinite(parsed) && parsed > 0 && parsed <= 180 ? parsed : 25
          const ms = Date.now() + minutes * 60_000
          
          if (!Number.isFinite(ms)) {
            addSystemMessage("Invalid timer value. Using default 25 minutes.")
            return
          }
          
          const endsAtIso = new Date(ms).toISOString()
          setTimerMinutes(minutes)
          setTimerEndsAtState(endsAtIso)
          setSessionStatus("active")

          try {
            await setTimerEndsAt(sessionData.id, endsAtIso)
            await insertMessage({
              sessionId: sessionData.id,
              kind: "system",
              content: `Timer set: ${minutes}m`,
              authorName: "system",
            })
          } catch (error) {
            console.error("Timer error:", error)
            addSystemMessage("Unable to set timer (permission or network error).")
          }
          break
        }

        case "/agenda":
          if (args) {
            setPinnedAgenda(args)
            try {
              await setAgenda(sessionData.id, args)
              await insertMessage({
                sessionId: sessionData.id,
                kind: "system",
                content: `Agenda updated: "${args}"`,
                authorName: "system",
              })
            } catch {
              addSystemMessage("Unable to update agenda (permission or network error).")
            }
          }
          break

        case "/tasks":
          try {
            const widgetInstance = await createWidget(sessionData.id, "tasks", "Task Slices")
            newWidget = {
              id: widgetInstance.id,
              type: "tasks",
              title: "Task Slices",
              value: "0 / 0",
              subtitle: "Empty",
              status: "idle",
              tasks: [],
            }
            addSystemMessage("Task board created and saved to database")
          } catch (error) {
            console.error("Failed to create task widget:", error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            addSystemMessage(`Failed to create task board: ${errorMsg}`)
          }
          break

        case "/decision":
          if (args) {
            const existing = widgets.find((w) => w.type === "decision")
            if (existing) {
              try {
                const decision = await addDecision(existing.id, args)
                setWidgets((prev) =>
                  prev.map((w) =>
                    w.id === existing.id
                      ? {
                          ...w,
                          decisions: [
                            {
                              id: decision.id,
                              text: decision.text,
                              creator: displayName,
                              timestamp: new Date(decision.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            },
                            ...(w.decisions || []),
                          ],
                          value: `${(w.decisions?.length || 0) + 1} logged`,
                        }
                      : w,
                  ),
                )
                addSystemMessage(`Decision recorded: "${args}"`)
              } catch (error) {
                console.error("Failed to add decision:", error)
                const errorMsg = error instanceof Error ? error.message : String(error)
                addSystemMessage(`Failed to record decision: ${errorMsg}`)
              }
              return
            }
            try {
              const widgetInstance = await createWidget(sessionData.id, "decision", "Decision Log")
              const decision = await addDecision(widgetInstance.id, args)
              newWidget = {
                id: widgetInstance.id,
                type: "decision",
                title: "Decision Log",
                value: "1 logged",
                status: "active",
                decisions: [
                  {
                    id: decision.id,
                    text: decision.text,
                    creator: displayName,
                    timestamp: new Date(decision.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ],
              }
              addSystemMessage(`Decision recorded: "${args}"`)
            } catch (error) {
              console.error("Failed to create decision widget:", error)
              const errorMsg = error instanceof Error ? error.message : String(error)
              addSystemMessage(`Failed to record decision: ${errorMsg}`)
            }
          }
          break

        case "/issues":
          if (args) {
            const existing = widgets.find((w) => w.type === "issues")
            if (existing) {
              try {
                const issue = await addIssue(existing.id, args)
                const newIssueObj = {
                  id: issue.id,
                  text: issue.text,
                  resolved: issue.resolved,
                  timestamp: new Date(issue.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                }
                const updatedIssues = [...(existing.issues || []), newIssueObj]
                setWidgets((prev) =>
                  prev.map((w) =>
                    w.id === existing.id
                      ? {
                          ...w,
                          issues: updatedIssues,
                          value: `${updatedIssues.filter((b) => !b.resolved).length} unresolved`,
                          status: "warning",
                        }
                      : w,
                  ),
                )
                addSystemMessage(`Issue flagged: "${args}"`)
              } catch (error) {
                console.error("Failed to add issue:", error)
                const errorMsg = error instanceof Error ? error.message : String(error)
                addSystemMessage(`Failed to flag issue: ${errorMsg}`)
              }
              return
            }
            try {
              const widgetInstance = await createWidget(sessionData.id, "issues", "Issues")
              await addIssue(widgetInstance.id, args)
              newWidget = {
                id: widgetInstance.id,
                type: "issues",
                title: "Issues",
                value: "1 unresolved",
                status: "warning",
                issues: [], // Will be loaded via realtime subscription
              }
              addSystemMessage(`Issue flagged: "${args}"`)
            } catch (error) {
              console.error("Failed to create issues widget:", error)
              const errorMsg = error instanceof Error ? error.message : String(error)
              addSystemMessage(`Failed to flag issue: ${errorMsg}`)
            }
          }
          break

        case "/code":
          try {
            const widgetInstance = await createWidget(sessionData.id, "code", "Code Focus")
            newWidget = {
              id: widgetInstance.id,
              type: "code",
              title: "Code Focus",
              value: "Ready",
              status: "active",
              codeContent: "// Focus snippet\n",
              codeLocked: false,
            }
            addSystemMessage("Code snippet opened")
          } catch (error) {
            console.error("Failed to create code widget:", error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            addSystemMessage(`Failed to open code snippet: ${errorMsg}`)
          }
          break

        case "/progress":
          try {
            const widgetInstance = await createWidget(sessionData.id, "progress", "Progress Check")
            newWidget = {
              id: widgetInstance.id,
              type: "progress",
              title: "Progress Check",
              value: "Collecting",
              status: "active",
              progressResponses: [],
            }
            addSystemMessage("Progress check initiated")
          } catch (error) {
            console.error("Failed to create progress widget:", error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            addSystemMessage(`Failed to initiate progress check: ${errorMsg}`)
          }
          break

        case "/next": {
          try {
            const unresolvedIssues = widgets
              .filter((w) => w.type === "issues")
              .flatMap((w) => w.issues || [])
              .filter((b) => !b.resolved)

            const widgetInstance = await createWidget(sessionData.id, "next", "Next Session")
            newWidget = {
              id: widgetInstance.id,
              type: "next",
              title: "Next Session",
              value: "Planning",
              status: "idle",
              nextSession: {
                goal: "",
                duration: 45,
                carryOverIssues: unresolvedIssues.map((b) => ({ ...b, selected: false })),
              },
            }
            addSystemMessage("Session planner opened")
          } catch (error) {
            console.error("Failed to create next session widget:", error)
            const errorMsg = error instanceof Error ? error.message : String(error)
            addSystemMessage(`Failed to open session planner: ${errorMsg}`)
          }
          break
        }

        default:
          addSystemMessage(`Unknown command: ${command}`)
      }

      // Don't add widget manually - subscription will broadcast it
      // Just expand it for the creator
      if (newWidget) {
        setExpandedWidgets((prev) => new Set([...prev, newWidget.id]))
      }
    },
    [handleSessionEnd, widgets, addSystemMessage, sessionData, displayName],
  )

  const handleAgendaChange = useCallback(
    async (agenda: string) => {
      if (!sessionData) return
      setPinnedAgenda(agenda)
      try {
        await setAgenda(sessionData.id, agenda)
        await insertMessage({
          sessionId: sessionData.id,
          kind: "system",
          content: `Agenda updated: "${agenda}"`,
          authorName: "system",
        })
      } catch {
        addSystemMessage("Unable to update agenda (permission or network error).")
      }
    },
    [sessionData, addSystemMessage],
  )

  const handleTimerSetMinutes = useCallback(
    async (minutes: number) => {
      if (!sessionData) return

      const validMinutes = Number.isFinite(minutes) && minutes > 0 && minutes <= 180 ? minutes : 25
      const ms = Date.now() + validMinutes * 60_000
      
      if (!Number.isFinite(ms)) {
        addSystemMessage("Invalid timer value. Using default 25 minutes.")
        return
      }
      
      const endsAtIso = new Date(ms).toISOString()
      setTimerMinutes(validMinutes)
      setTimerEndsAtState(endsAtIso)
      setSessionStatus("active")

      try {
        await setTimerEndsAt(sessionData.id, endsAtIso)
        await insertMessage({
          sessionId: sessionData.id,
          kind: "system",
          content: `Timer set: ${validMinutes}m`,
          authorName: "system",
        })
      } catch (error) {
        console.error("Timer error:", error)
        addSystemMessage("Unable to set timer (permission or network error).")
      }
    },
    [sessionData, addSystemMessage],
  )

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
    async (id: string, updates: Partial<Widget>) => {
      // Get widget BEFORE updating state
      const widget = widgets.find(w => w.id === id)
      if (!widget) return

      // Update local state immediately for responsive UI
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)))

      // Persist updates to database based on widget type
      try {
        // Handle task updates
        if (updates.tasks && widget.type === "tasks") {
          const completedCount = updates.tasks.filter((t) => t.completed).length
          if (completedCount > 0 && lockState === "soft") {
            setLockState("none")
            setMessageCount(0)
            addSystemMessage("Task completed. Lock released.")
          }
          
          // Update each modified task in database
          for (const task of updates.tasks) {
            if (task.id && !task.id.startsWith('temp-')) {
              await updateTaskItem(task.id, {
                text: task.text,
                completed: task.completed,
                position: (task as any).position || 0
              }).catch(err => console.error('Failed to update task:', err))
            }
          }
        }

        // Handle issue updates (resolve/unresolve)
        if (updates.issues && widget.type === "issues") {
          for (const issue of updates.issues) {
            if (issue.id && !issue.id.startsWith('temp-')) {
              await updateIssue(issue.id, issue.resolved).catch(err => 
                console.error('Failed to update issue:', err)
              )
            }
          }
        }

        // Handle code snippet updates
        if (updates.codeContent !== undefined && widget.type === "code") {
          await upsertCodeSnippet(
            id, 
            updates.codeContent,
            (updates as any).codeLanguage
          ).catch(err => console.error('Failed to update code snippet:', err))
        }
      } catch (error) {
        console.error('Widget update error:', error)
      }
    },
    [lockState, addSystemMessage, widgets],
  )

  const handleAddTask = useCallback(
    async (widgetId: string, text: string): Promise<Task> => {
      const taskItem = await addTaskItem(widgetId, text)
      return {
        id: taskItem.id,
        text: taskItem.text,
        completed: taskItem.completed,
      }
    },
    [],
  )

  const handleAddDecision = useCallback(
    async (widgetId: string, text: string): Promise<Decision> => {
      const decision = await addDecision(widgetId, text)
      return {
        id: decision.id,
        text: decision.text,
        creator: displayName,
        timestamp: new Date(decision.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    },
    [displayName],
  )

  const handleAddIssue = useCallback(
    async (widgetId: string, text: string): Promise<Issue> => {
      const issue = await addIssue(widgetId, text)
      return {
        id: issue.id,
        text: issue.text,
        resolved: issue.resolved,
        timestamp: new Date(issue.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
    },
    [],
  )

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
          <span className="font-mono text-sm text-[#52525b]">Loading session...</span>
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
        timerEndsAt={timerEndsAt}
        pinnedAgenda={pinnedAgenda}
        onAgendaChange={handleAgendaChange}
        onTimerSetMinutes={handleTimerSetMinutes}
        focusLevel={focusLevel}
        lockState={lockState}
        onSessionEnd={handleSessionEnd}
        sessionStatus={sessionStatus}
        lastCommand={lastCommand}
      />

      <div id="main-content" className="flex flex-1 bg-[#0a0a0b] overflow-hidden">
        {/* Left: Widgets (288px on desktop, hidden on mobile) */}
        <div className="hidden md:block">
          <WidgetZone
            widgets={widgets}
            expandedWidgets={expandedWidgets}
            onToggleWidget={toggleWidget}
            onUpdateWidget={handleUpdateWidget}
            onAddTask={handleAddTask}
          />
        </div>
        {/* Center: Chat (flex-1) */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatStream messages={messages} />
          </div>
          <div className="shrink-0 bg-[#0a0a0b] border-t border-[#27272a]">
            <MessageInput
              ref={messageInputRef}
              onSendMessage={handleSendMessage}
              onExecuteCommand={handleExecuteCommand}
              lockState={lockState}
            />
          </div>
        </div>
        {/* Right: Settings (collapsible, hidden on mobile) */}
        <div className="hidden lg:block">
          <RoomSettings
            collapsed={settingsCollapsed}
            onToggleCollapse={() => setSettingsCollapsed((c) => !c)}
          />
        </div>
      </div>

      <SystemStatusBar
        sessionStatus={sessionStatus}
        timeRemaining={timeRemaining}
        lastCommand={lastCommand}
        lockState={lockState}
        sessionId={sessionData?.id}
      />
    </div>
  )
}
