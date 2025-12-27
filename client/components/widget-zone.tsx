"use client"

import {
  TrendingUp,
  Zap,
  Clock,
  ChevronDown,
  CheckSquare,
  Plus,
  X,
  BookOpen,
  AlertTriangle,
  Code,
  Users,
  ArrowRight,
  Lock,
  Unlock,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface Decision {
  id: string
  text: string
  creator: string
  timestamp: string
}

export interface Issue {
  id: string
  text: string
  resolved: boolean
  timestamp: string
  selected?: boolean
}

export interface ProgressResponse {
  id: string
  participant: string
  response: string
  timestamp: string
}

export interface NextSessionData {
  goal: string
  duration: number
  carryOverIssues: Issue[]
}

export interface Widget {
  id: string
  type: "timer" | "metric" | "status" | "tasks" | "summary" | "decision" | "issues" | "code" | "progress" | "next"
  title: string
  value: string
  createdBy?: string
  subtitle?: string
  status?: "active" | "idle" | "warning"
  details?: string
  tasks?: Task[]
  decisions?: Decision[]
  issues?: Issue[]
  codeContent?: string
  codeLocked?: boolean
  progressResponses?: ProgressResponse[]
  nextSession?: NextSessionData
  summary?: {
    completedItems: string[]
    incompleteItems: string[]
    decisions: string[]
    issues: string[]
    recommendations: string[]
  }
}

interface WidgetZoneProps {
  widgets: Widget[]
  expandedWidgets: Set<string>
  onToggleWidget: (id: string) => void
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
  onAddTask?: (widgetId: string, text: string) => Promise<Task>
}

export function WidgetZone({ widgets, expandedWidgets, onToggleWidget, onUpdateWidget, onAddTask }: WidgetZoneProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [selectedWidgetForMobile, setSelectedWidgetForMobile] = useState<string | null>(null)

  const getIcon = (type: Widget["type"]) => {
    switch (type) {
      case "timer":
        return <Clock className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "metric":
        return <TrendingUp className="h-4 w-4" style={{ color: "#10B981" }} />
      case "status":
        return <Zap className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "tasks":
        return <CheckSquare className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "summary":
        return <CheckSquare className="h-4 w-4" style={{ color: "#10B981" }} />
      case "decision":
        return <BookOpen className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "issues":
        return <AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />
      case "code":
        return <Code className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "progress":
        return <Users className="h-4 w-4" style={{ color: "#10B981" }} />
      case "next":
        return <ArrowRight className="h-4 w-4" style={{ color: "#3B82F6" }} />
    }
  }

  const getStatusColor = (status?: Widget["status"]) => {
    switch (status) {
      case "active":
        return "#10B981"
      case "warning":
        return "#F59E0B"
      default:
        return "#52525B"
    }
  }

  const handleWidgetClick = (widgetId: string) => {
    if (window.innerWidth < 768) {
      setSelectedWidgetForMobile(widgetId)
      setMobileSheetOpen(true)
    } else {
      onToggleWidget(widgetId)
    }
  }

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetForMobile)

  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case "summary":
        return <SummaryContent widget={widget} />
      case "tasks":
        return <TaskBoardContent widget={widget} onUpdateWidget={onUpdateWidget} onAddTask={onAddTask} />
      case "decision":
        return <DecisionLogContent widget={widget} />
      case "issues":
        return <IssuesContent widget={widget} onUpdateWidget={onUpdateWidget} />
      case "code":
        return <CodeFocusContent widget={widget} onUpdateWidget={onUpdateWidget} />
      case "progress":
        return <ProgressCheckContent widget={widget} onUpdateWidget={onUpdateWidget} />
      case "next":
        return <NextSessionContent widget={widget} onUpdateWidget={onUpdateWidget} />
      default:
        return (
          <>
            <div className="font-mono text-xl font-bold" style={{ color: "#FFFFFF" }}>
              {widget.value}
            </div>
            {widget.subtitle && (
              <div className="mt-1 text-xs font-mono" style={{ color: "#52525B" }}>
                {widget.subtitle}
              </div>
            )}
            {widget.details && (
              <div className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                {widget.details}
              </div>
            )}
          </>
        )
    }
  }

  return (
    <>
      {/* Desktop/Tablet: Sidebar layout */}
      <div
        className="flex w-72 flex-col gap-2.5 overflow-y-auto p-3 border-r border-[#1a1a1f] bg-[#0a0a0b] custom-scrollbar"
        role="region"
        aria-label="Widget zone"
      >
        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-12 w-12 rounded-xl bg-[#111113] border border-[#1a1a1f] flex items-center justify-center mb-4">
              <CheckSquare className="h-6 w-6 text-[#52525b]" />
            </div>
            <p className="font-mono text-sm text-[#71717a] font-medium">No widgets yet</p>
            <p className="font-mono text-xs text-[#3f3f46] mt-2">Type <span className="text-[#3b82f6]">/tasks</span>, <span className="text-[#3b82f6]">/decision</span>, or <span className="text-[#3b82f6]">/code</span> to get started</p>
          </div>
        )}

        {widgets.map((widget) => {
          const isExpanded = expandedWidgets.has(widget.id)
          return (
            <Collapsible key={widget.id} open={isExpanded} onOpenChange={() => onToggleWidget(widget.id)}>
              <div
                className={`rounded-lg transition-all duration-200 ease-out border ${
                  isExpanded 
                    ? "bg-[#111113] border-[#27272a] shadow-lg" 
                    : "bg-transparent border-transparent hover:bg-[#0f0f10] hover:border-[#1a1a1f]"
                }`}
                role="article"
                aria-label={`${widget.title} widget`}
              >
                <CollapsibleTrigger
                  className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-lg"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${widget.title}`}
                >
                  <div className="flex h-12 items-center gap-3 px-4 md:flex-col md:py-2 lg:flex-row lg:py-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#0a0a0b]/50">
                      {getIcon(widget.type)}
                    </div>
                    <span
                      className="text-sm font-medium flex-1 text-left truncate md:hidden lg:block"
                      style={{ color: "#fafafa" }}
                    >
                      {widget.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-6 px-2.5 text-xs border-0 md:hidden lg:flex font-mono"
                      style={{
                        backgroundColor: getStatusColor(widget.status) + "20",
                        color: getStatusColor(widget.status),
                      }}
                    >
                      {widget.status || "idle"}
                    </Badge>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200 ease-out md:hidden lg:block"
                      style={{
                        color: "#71717a",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="transition-all duration-200 ease-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down hidden lg:block overflow-hidden">
                  <div className="px-4 pb-4 pt-2">{renderWidgetContent(widget)}</div>
                </CollapsibleContent>

                {/* Tablet overlay */}
                {isExpanded && (
                  <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm hidden md:flex lg:hidden items-center justify-center p-4">
                    <div
                      className="relative w-full max-w-md rounded-lg p-6 shadow-2xl border"
                      style={{ backgroundColor: "#1A1A1A", borderColor: "#262626" }}
                    >
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleWidget(widget.id)
                        }}
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                      >
                        <X className="h-4 w-4" style={{ color: "#52525B" }} />
                      </Button>

                      <div className="flex items-center gap-2 mb-4">
                        {getIcon(widget.type)}
                        <h2 className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>
                          {widget.title}
                        </h2>
                      </div>

                      {renderWidgetContent(widget)}
                    </div>
                  </div>
                )}
              </div>
            </Collapsible>
          )
        })}
      </div>

      {/* Mobile bottom bar */}
      <div
        className="md:hidden fixed bottom-20 left-0 right-0 h-12 flex items-center gap-2 px-4 overflow-x-auto border-t"
        style={{ backgroundColor: "#1A1A1A", borderColor: "#262626" }}
        role="region"
        aria-label="Widget quick access"
      >
        {widgets.length === 0 && (
          <p className="text-xs font-mono" style={{ color: "#52525B" }}>
            No widgets
          </p>
        )}
        {widgets.map((widget) => (
          <Button
            key={widget.id}
            onClick={() => handleWidgetClick(widget.id)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Open ${widget.title}`}
          >
            {getIcon(widget.type)}
          </Button>
        ))}
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] border-t"
          style={{ backgroundColor: "#1A1A1A", borderColor: "#262626" }}
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2" style={{ color: "#FFFFFF" }}>
              {selectedWidget && getIcon(selectedWidget.type)}
              {selectedWidget?.title}
            </SheetTitle>
          </SheetHeader>
          {selectedWidget && (
            <div className="mt-6 overflow-y-auto max-h-[calc(80vh-120px)]">{renderWidgetContent(selectedWidget)}</div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

// Task Board Content
function TaskBoardContent({
  widget,
  onUpdateWidget,
  onAddTask,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
  onAddTask?: (widgetId: string, text: string) => Promise<Task>
}) {
  const [newTaskText, setNewTaskText] = useState("")
  const tasks = widget.tasks || []

  const addTask = async () => {
    if (!newTaskText.trim()) return

    let newTask: Task
    if (onAddTask) {
      try {
        // Get real UUID from database
        newTask = await onAddTask(widget.id, newTaskText.trim())
      } catch (error) {
        console.error('Failed to add task:', error)
        return
      }
    } else {
      // Fallback to temporary ID (shouldn't happen)
      newTask = {
        id: `temp-${Date.now()}`,
        text: newTaskText.trim(),
        completed: false,
      }
    }

    const updatedTasks = [...tasks, newTask]
    const completed = updatedTasks.filter((t) => t.completed).length
    const total = updatedTasks.length

    onUpdateWidget(widget.id, {
      tasks: updatedTasks,
      value: `${completed} / ${total}`,
      status: completed === total && total > 0 ? "active" : "idle",
      subtitle: total === 0 ? "Empty" : `${total - completed} remaining`,
    })

    setNewTaskText("")
  }

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    const completed = updatedTasks.filter((t) => t.completed).length
    const total = updatedTasks.length

    onUpdateWidget(widget.id, {
      tasks: updatedTasks,
      value: `${completed} / ${total}`,
      status: completed === total && total > 0 ? "active" : "idle",
      subtitle: total === 0 ? "Empty" : `${total - completed} remaining`,
    })
  }

  const removeTask = (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId)
    const completed = updatedTasks.filter((t) => t.completed).length
    const total = updatedTasks.length

    onUpdateWidget(widget.id, {
      tasks: updatedTasks,
      value: total > 0 ? `${completed} / ${total}` : "0 / 0",
      status: completed === total && total > 0 ? "active" : "idle",
      subtitle: total === 0 ? "Empty" : `${total - completed} remaining`,
    })
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-xl font-bold" style={{ color: "#FFFFFF" }}>
        {widget.value}
      </div>
      {widget.subtitle && (
        <div className="text-xs font-mono" style={{ color: "#52525B" }}>
          {widget.subtitle}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="add task slice..."
          className="h-8 bg-[#0D0D0D] border-[#262626] text-sm font-mono placeholder:text-[#3D3D3D] focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
          style={{ color: "#FFFFFF" }}
        />
        <Button
          onClick={addTask}
          size="icon"
          disabled={!newTaskText.trim()}
          className="h-8 w-8 shrink-0 bg-[#3B82F6] hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#262626] group">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="border-[#52525B] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
              />
              <span
                className="flex-1 text-sm font-mono"
                style={{
                  color: task.completed ? "#52525B" : "#FFFFFF",
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.text}
              </span>
              <Button
                onClick={() => removeTask(task.id)}
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" style={{ color: "#EF4444" }} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Decision Log Content
function DecisionLogContent({ widget }: { widget: Widget }) {
  const decisions = widget.decisions || []

  return (
    <div className="space-y-3">
      <div className="font-mono text-xl font-bold" style={{ color: "#FFFFFF" }}>
        {widget.value}
      </div>

      {decisions.length === 0 ? (
        <p className="text-sm font-mono" style={{ color: "#52525B" }}>
          No decisions recorded
        </p>
      ) : (
        <div className="space-y-2">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="p-2 rounded border-l-2"
              style={{ backgroundColor: "#0D0D0D", borderColor: "#3B82F6" }}
            >
              <p className="text-sm" style={{ color: "#FFFFFF" }}>
                {decision.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono" style={{ color: "#52525B" }}>
                  {decision.creator}
                </span>
                <span className="text-xs font-mono" style={{ color: "#3D3D3D" }}>
                  {decision.timestamp}
                </span>
                <Lock className="h-3 w-3 ml-auto" style={{ color: "#52525B" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Issues Content
function IssuesContent({
  widget,
  onUpdateWidget,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}) {
  const issues = widget.issues || []

  const toggleIssue = (issueId: string) => {
    const updatedIssues = issues.map((b) => (b.id === issueId ? { ...b, resolved: !b.resolved } : b))
    const unresolvedCount = updatedIssues.filter((b) => !b.resolved).length

    onUpdateWidget(widget.id, {
      issues: updatedIssues,
      value: `${unresolvedCount} unresolved`,
      status: unresolvedCount > 0 ? "warning" : "active",
    })
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-xl font-bold" style={{ color: "#FFFFFF" }}>
        {widget.value}
      </div>

      {issues.length === 0 ? (
        <p className="text-sm font-mono" style={{ color: "#52525B" }}>
          No issues flagged
        </p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: "#0D0D0D" }}>
              <Button
                onClick={() => toggleIssue(issue.id)}
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0 mt-0.5"
              >
                {issue.resolved ? (
                  <CheckSquare className="h-4 w-4" style={{ color: "#10B981" }} />
                ) : (
                  <AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />
                )}
              </Button>
              <div className="flex-1">
                <p
                  className="text-sm"
                  style={{
                    color: issue.resolved ? "#52525B" : "#FFFFFF",
                    textDecoration: issue.resolved ? "line-through" : "none",
                  }}
                >
                  {issue.text}
                </p>
                <span className="text-xs font-mono" style={{ color: "#3D3D3D" }}>
                  {issue.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Code Focus Content
function CodeFocusContent({
  widget,
  onUpdateWidget,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}) {
  const [code, setCode] = useState(widget.codeContent || "")
  const isLocked = widget.codeLocked

  const toggleLock = () => {
    onUpdateWidget(widget.id, { codeLocked: !isLocked })
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    onUpdateWidget(widget.id, { codeContent: value })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm" style={{ color: "#52525B" }}>
          {isLocked ? "LOCKED" : "EDITABLE"}
        </div>
        <div className="flex gap-1">
          <Button onClick={toggleLock} size="icon" variant="ghost" className="h-6 w-6">
            {isLocked ? (
              <Lock className="h-3 w-3" style={{ color: "#F59E0B" }} />
            ) : (
              <Unlock className="h-3 w-3" style={{ color: "#10B981" }} />
            )}
          </Button>
          <Button
            onClick={copyCode}
            size="sm"
            variant="ghost"
            className="h-6 text-xs font-mono"
            style={{ color: "#52525B" }}
          >
            copy
          </Button>
        </div>
      </div>

      <Textarea
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={isLocked}
        className="min-h-[200px] font-mono text-sm bg-[#0D0D0D] border-[#262626] focus-visible:ring-1 focus-visible:ring-[#3B82F6] resize-none"
        style={{ color: "#FFFFFF" }}
        placeholder="// Enter code here..."
      />
    </div>
  )
}

// Progress Check Content
function ProgressCheckContent({
  widget,
  onUpdateWidget,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}) {
  const [response, setResponse] = useState("")
  const responses = widget.progressResponses || []
  const hasSubmitted = responses.some((r) => r.participant === "you")

  const submitResponse = () => {
    if (!response.trim() || hasSubmitted) return

    const newResponse: ProgressResponse = {
      id: Date.now().toString(),
      participant: "you",
      response: response.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    onUpdateWidget(widget.id, {
      progressResponses: [...responses, newResponse],
      value: `${responses.length + 1} responses`,
      status: "active",
    })

    setResponse("")
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-xl font-bold" style={{ color: "#FFFFFF" }}>
        {widget.value}
      </div>

      {!hasSubmitted && (
        <div className="space-y-2">
          <p className="text-sm" style={{ color: "#A1A1AA" }}>
            What did you complete?
          </p>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="min-h-[80px] font-mono text-sm bg-[#0D0D0D] border-[#262626] focus-visible:ring-1 focus-visible:ring-[#3B82F6] resize-none"
            style={{ color: "#FFFFFF" }}
            placeholder="Describe your progress..."
          />
          <Button
            onClick={submitResponse}
            disabled={!response.trim()}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            Submit
          </Button>
        </div>
      )}

      {responses.length > 0 && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: "#262626" }}>
          <p className="text-xs font-mono uppercase" style={{ color: "#52525B" }}>
            Responses
          </p>
          {responses.map((r) => (
            <div key={r.id} className="p-2 rounded" style={{ backgroundColor: "#0D0D0D" }}>
              <p className="text-sm" style={{ color: "#FFFFFF" }}>
                {r.response}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono" style={{ color: "#52525B" }}>
                  {r.participant}
                </span>
                <span className="text-xs font-mono" style={{ color: "#3D3D3D" }}>
                  {r.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Next Session Content
function NextSessionContent({
  widget,
  onUpdateWidget,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}) {
  const nextSession = widget.nextSession || { goal: "", duration: 45, carryOverIssues: [] }

  const setGoal = (goal: string) => {
    onUpdateWidget(widget.id, {
      nextSession: { ...nextSession, goal },
    })
  }

  const setDuration = (duration: number) => {
    onUpdateWidget(widget.id, {
      nextSession: { ...nextSession, duration },
    })
  }

  const toggleIssue = (issueId: string) => {
    const updatedIssues = nextSession.carryOverIssues.map((b) =>
      b.id === issueId ? { ...b, selected: !b.selected } : b,
    )
    onUpdateWidget(widget.id, {
      nextSession: { ...nextSession, carryOverIssues: updatedIssues },
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase" style={{ color: "#52525B" }}>
          Goal
        </label>
        <Input
          value={nextSession.goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Next session focus..."
          className="h-8 bg-[#0D0D0D] border-[#262626] text-sm font-mono placeholder:text-[#3D3D3D] focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
          style={{ color: "#FFFFFF" }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-mono uppercase" style={{ color: "#52525B" }}>
          Duration
        </label>
        <div className="flex gap-2">
          {[25, 45, 90].map((mins) => (
            <Button
              key={mins}
              onClick={() => setDuration(mins)}
              size="sm"
              variant={nextSession.duration === mins ? "default" : "outline"}
              className={`flex-1 font-mono ${
                nextSession.duration === mins
                  ? "bg-[#3B82F6] hover:bg-[#2563EB]"
                  : "border-[#262626] hover:bg-[#262626]"
              }`}
              style={{ color: "#FFFFFF" }}
            >
              {mins}m
            </Button>
          ))}
        </div>
      </div>

      {nextSession.carryOverIssues.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase" style={{ color: "#52525B" }}>
            Carry Over Issues
          </label>
          <div className="space-y-1">
            {nextSession.carryOverIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-2 p-2 rounded"
                style={{ backgroundColor: "#0D0D0D" }}
              >
                <Checkbox
                  checked={issue.selected}
                  onCheckedChange={() => toggleIssue(issue.id)}
                  className="border-[#52525B] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
                />
                <span className="text-sm" style={{ color: "#FFFFFF" }}>
                  {issue.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] font-mono" disabled={!nextSession.goal.trim()}>
        Create Session Seed
      </Button>
    </div>
  )
}

// Summary Content
function SummaryContent({ widget }: { widget: Widget }) {
  const { summary } = widget
  if (!summary) return null

  const copyMarkdown = () => {
    const markdown = `# Session Summary

## Completed Items
${summary.completedItems.map((item) => `- [x] ${item}`).join("\n") || "- None"}

## Incomplete Items
${summary.incompleteItems.map((item) => `- [ ] ${item}`).join("\n") || "- None"}

## Decisions
${summary.decisions.map((item) => `- ${item}`).join("\n") || "- None"}

## Issues
${summary.issues.map((item) => `- ${item}`).join("\n") || "- None"}

## Recommendations
${summary.recommendations.map((item) => `- ${item}`).join("\n")}
`
    navigator.clipboard.writeText(markdown)
  }

  return (
    <div className="space-y-4">
      {/* Completed */}
      <div>
        <h3 className="text-xs font-mono uppercase mb-2" style={{ color: "#10B981" }}>
          Completed ({summary.completedItems.length})
        </h3>
        {summary.completedItems.length > 0 ? (
          <ul className="space-y-1">
            {summary.completedItems.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#A1A1AA" }}>
                <CheckSquare className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-mono" style={{ color: "#52525B" }}>
            None
          </p>
        )}
      </div>

      {/* Incomplete */}
      <div>
        <h3 className="text-xs font-mono uppercase mb-2" style={{ color: "#F59E0B" }}>
          Incomplete ({summary.incompleteItems.length})
        </h3>
        {summary.incompleteItems.length > 0 ? (
          <ul className="space-y-1">
            {summary.incompleteItems.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#A1A1AA" }}>
                <span className="text-xs mt-0.5">[ ]</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-mono" style={{ color: "#52525B" }}>
            None
          </p>
        )}
      </div>

      {/* Decisions */}
      {summary.decisions.length > 0 && (
        <div>
          <h3 className="text-xs font-mono uppercase mb-2" style={{ color: "#3B82F6" }}>
            Decisions
          </h3>
          <ul className="space-y-1">
            {summary.decisions.map((item, i) => (
              <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {summary.issues.length > 0 && (
        <div>
          <h3 className="text-xs font-mono uppercase mb-2" style={{ color: "#EF4444" }}>
            Issues
          </h3>
          <ul className="space-y-1">
            {summary.issues.map((item, i) => (
              <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <h3 className="text-xs font-mono uppercase mb-2" style={{ color: "#52525B" }}>
          Recommendations
        </h3>
        <ul className="space-y-1">
          {summary.recommendations.map((item, i) => (
            <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: "#262626" }}>
        <Button onClick={copyMarkdown} className="w-full bg-[#3B82F6] hover:bg-[#2563EB] font-mono">
          Copy Markdown
        </Button>
        <Button
          variant="outline"
          className="w-full border-[#262626] hover:bg-[#262626] font-mono bg-transparent"
          style={{ color: "#FFFFFF" }}
        >
          Start Next Session
        </Button>
        <Button variant="ghost" className="w-full font-mono" style={{ color: "#52525B" }}>
          Close
        </Button>
      </div>
    </div>
  )
}
