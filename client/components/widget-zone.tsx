"use client"

import { TrendingUp, Zap, Clock, ChevronDown, CheckSquare, Plus, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface Widget {
  id: string
  type: "timer" | "metric" | "status" | "tasks" | "summary"
  title: string
  value: string
  subtitle?: string
  status?: "active" | "idle" | "warning"
  details?: string
  tasks?: Task[]
  summary?: {
    completedItems: string[]
    incompleteItems: string[]
    decisions: string[]
    blockers: string[]
    recommendations: string[]
  }
}

interface WidgetZoneProps {
  widgets: Widget[]
  expandedWidgets: Set<string>
  onToggleWidget: (id: string) => void
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}

export function WidgetZone({ widgets, expandedWidgets, onToggleWidget, onUpdateWidget }: WidgetZoneProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [selectedWidgetForMobile, setSelectedWidgetForMobile] = useState<string | null>(null)

  const getIcon = (type: Widget["type"]) => {
    switch (type) {
      case "timer":
        return <Clock className="h-4 w-4" style={{ color: "#A1A1AA" }} />
      case "metric":
        return <TrendingUp className="h-4 w-4" style={{ color: "#10B981" }} />
      case "status":
        return <Zap className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "tasks":
        return <CheckSquare className="h-4 w-4" style={{ color: "#3B82F6" }} />
      case "summary":
        return <CheckSquare className="h-4 w-4" style={{ color: "#10B981" }} />
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

  return (
    <>
      {/* Desktop/Tablet: Sidebar layout */}
      <div
        className="hidden md:flex w-16 md:w-16 lg:w-80 flex-col gap-2 overflow-y-auto p-1"
        style={{ backgroundColor: "#1A1A1A" }}
        role="region"
        aria-label="Widget zone"
      >
        {widgets.length === 0 && (
          <div className="hidden lg:flex flex-col items-center justify-center py-8 px-4 text-center">
            <CheckSquare className="h-8 w-8 mb-2" style={{ color: "#52525B" }} />
            <p className="text-sm" style={{ color: "#52525B" }}>
              No widgets yet. Use /timer, /agenda, or /tasks to create one.
            </p>
          </div>
        )}

        {widgets.map((widget) => {
          const isExpanded = expandedWidgets.has(widget.id)
          return (
            <Collapsible key={widget.id} open={isExpanded} onOpenChange={() => onToggleWidget(widget.id)}>
              <div
                className="rounded transition-all duration-200 ease-out"
                style={{
                  backgroundColor: isExpanded ? "#262626" : "transparent",
                  outline: isExpanded ? "2px solid #3B82F6" : "none",
                  outlineOffset: "-2px",
                }}
                role="article"
                aria-label={`${widget.title} widget`}
              >
                <CollapsibleTrigger
                  className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${widget.title}`}
                >
                  <div className="flex h-10 items-center gap-3 px-3 md:flex-col md:py-2 lg:flex-row lg:py-0">
                    {getIcon(widget.type)}
                    <span
                      className="text-sm font-medium flex-1 text-left truncate md:hidden lg:block"
                      style={{ color: "#FFFFFF" }}
                    >
                      {widget.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 px-2 text-xs border-0 md:hidden lg:flex"
                      style={{
                        backgroundColor: "#1A1A1A",
                        color: getStatusColor(widget.status),
                      }}
                    >
                      {widget.status || "idle"}
                    </Badge>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200 ease-out md:hidden lg:block"
                      style={{
                        color: "#A1A1AA",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="transition-all duration-200 ease-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down hidden lg:block">
                  <div className="px-3 pb-3 pt-1">
                    {widget.type === "summary" ? (
                      <SummaryContent widget={widget} />
                    ) : widget.type === "tasks" ? (
                      <TaskBoardContent widget={widget} onUpdateWidget={onUpdateWidget} />
                    ) : (
                      <>
                        <div className="font-mono text-2xl font-bold" style={{ color: "#FFFFFF" }}>
                          {widget.value}
                        </div>

                        {widget.subtitle && (
                          <div className="mt-1 text-xs" style={{ color: "#52525B" }}>
                            {widget.subtitle}
                          </div>
                        )}

                        {widget.details && (
                          <div className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                            {widget.details}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CollapsibleContent>

                {isExpanded && (
                  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm hidden md:flex lg:hidden items-center justify-center p-4">
                    <div
                      className="relative w-full max-w-md rounded-lg p-6 shadow-2xl"
                      style={{ backgroundColor: "#262626" }}
                    >
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleWidget(widget.id)
                        }}
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                      >
                        <X className="h-4 w-4" style={{ color: "#A1A1AA" }} />
                      </Button>

                      <h2 className="text-lg font-semibold mb-4" style={{ color: "#FFFFFF" }}>
                        {widget.title}
                      </h2>

                      {widget.type === "summary" ? (
                        <SummaryContent widget={widget} />
                      ) : widget.type === "tasks" ? (
                        <TaskBoardContent widget={widget} onUpdateWidget={onUpdateWidget} />
                      ) : (
                        <>
                          <div className="font-mono text-2xl font-bold" style={{ color: "#FFFFFF" }}>
                            {widget.value}
                          </div>

                          {widget.subtitle && (
                            <div className="mt-1 text-xs" style={{ color: "#52525B" }}>
                              {widget.subtitle}
                            </div>
                          )}

                          {widget.details && (
                            <div className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                              {widget.details}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Collapsible>
          )
        })}
      </div>

      <div
        className="md:hidden fixed bottom-14 left-0 right-0 h-12 flex items-center gap-2 px-4 overflow-x-auto"
        style={{ backgroundColor: "#1A1A1A", borderTop: "1px solid #262626" }}
        role="region"
        aria-label="Widget quick access"
      >
        {widgets.length === 0 && (
          <p className="text-xs" style={{ color: "#52525B" }}>
            No widgets yet
          </p>
        )}
        {widgets.map((widget) => (
          <Button
            key={widget.id}
            onClick={() => handleWidgetClick(widget.id)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            aria-label={`Open ${widget.title}`}
          >
            {getIcon(widget.type)}
          </Button>
        ))}
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] border-0" style={{ backgroundColor: "#262626" }}>
          <SheetHeader>
            <SheetTitle style={{ color: "#FFFFFF" }}>{selectedWidget?.title}</SheetTitle>
          </SheetHeader>
          {selectedWidget && (
            <div className="mt-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {selectedWidget.type === "summary" ? (
                <SummaryContent widget={selectedWidget} />
              ) : selectedWidget.type === "tasks" ? (
                <TaskBoardContent widget={selectedWidget} onUpdateWidget={onUpdateWidget} />
              ) : (
                <>
                  <div className="font-mono text-2xl font-bold" style={{ color: "#FFFFFF" }}>
                    {selectedWidget.value}
                  </div>

                  {selectedWidget.subtitle && (
                    <div className="mt-1 text-xs" style={{ color: "#52525B" }}>
                      {selectedWidget.subtitle}
                    </div>
                  )}

                  {selectedWidget.details && (
                    <div className="mt-3 text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                      {selectedWidget.details}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function TaskBoardContent({
  widget,
  onUpdateWidget,
}: {
  widget: Widget
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void
}) {
  const [newTaskText, setNewTaskText] = useState("")
  const tasks = widget.tasks || []

  const addTask = () => {
    if (!newTaskText.trim()) return

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
    }

    const updatedTasks = [...tasks, newTask]
    const completed = updatedTasks.filter((t) => t.completed).length
    const total = updatedTasks.length

    onUpdateWidget(widget.id, {
      tasks: updatedTasks,
      value: `${completed} / ${total}`,
      status: completed === total && total > 0 ? "active" : "idle",
      subtitle: total === 0 ? "Ready to start" : `${total - completed} remaining`,
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
      subtitle: total === 0 ? "Ready to start" : `${total - completed} remaining`,
    })
  }

  const removeTask = (taskId: string) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId)
    const completed = updatedTasks.filter((t) => t.completed).length
    const total = updatedTasks.length

    onUpdateWidget(widget.id, {
      tasks: updatedTasks,
      value: `${completed} / ${total}`,
      status: completed === total && total > 0 ? "active" : "idle",
      subtitle: total === 0 ? "Ready to start" : `${total - completed} remaining`,
    })
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="font-mono text-2xl font-bold" style={{ color: "#FFFFFF" }}>
        {widget.value}
      </div>
      {widget.subtitle && (
        <div className="text-xs" style={{ color: "#52525B" }}>
          {widget.subtitle}
        </div>
      )}

      {/* Add task input */}
      <div className="flex items-center gap-1">
        <Input
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task slice..."
          className="h-8 bg-[#1A1A1A] border-0 text-sm placeholder:text-[#52525B] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          style={{ color: "#FFFFFF" }}
        />
        <Button
          onClick={addTask}
          size="icon"
          disabled={!newTaskText.trim()}
          className="h-8 w-8 shrink-0 bg-[#3B82F6] hover:bg-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#1A1A1A] group">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
                className="border-[#52525B] data-[state=checked]:bg-[#3B82F6] data-[state=checked]:border-[#3B82F6]"
              />
              <span
                className="flex-1 text-sm"
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

function SummaryContent({ widget }: { widget: Widget }) {
  const { summary } = widget
  if (!summary) return null

  const copyMarkdown = () => {
    const markdown = `# Session Summary

## Completed Items
${summary.completedItems.map((item) => `- [x] ${item}`).join("\n") || "None"}

## Incomplete Items
${summary.incompleteItems.map((item) => `- [ ] ${item}`).join("\n") || "None"}

## Decisions
${summary.decisions.map((item) => `- ${item}`).join("\n") || "None"}

## Blockers
${summary.blockers.map((item) => `- ${item}`).join("\n") || "None"}

## AI Recommendations
${summary.recommendations.map((item) => `- ${item}`).join("\n")}
`
    navigator.clipboard.writeText(markdown)

    // Visual feedback
    const button = document.activeElement as HTMLButtonElement
    if (button) {
      const originalText = button.textContent
      button.textContent = "Copied!"
      setTimeout(() => {
        button.textContent = originalText
      }, 2000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary sections */}
      <div className="space-y-3">
        {/* Completed Items */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#10B981" }}>
            Completed Items ({summary.completedItems.length})
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
            <p className="text-sm" style={{ color: "#52525B" }}>
              No items completed
            </p>
          )}
        </div>

        {/* Incomplete Items */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#F59E0B" }}>
            Incomplete Items ({summary.incompleteItems.length})
          </h3>
          {summary.incompleteItems.length > 0 ? (
            <ul className="space-y-1">
              {summary.incompleteItems.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#A1A1AA" }}>
                  <span className="text-xs mt-0.5">□</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "#52525B" }}>
              No items remaining
            </p>
          )}
        </div>

        {/* Decisions */}
        {summary.decisions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#3B82F6" }}>
              Decisions
            </h3>
            <ul className="space-y-1">
              {summary.decisions.map((item, i) => (
                <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blockers */}
        {summary.blockers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#EF4444" }}>
              Blockers
            </h3>
            <ul className="space-y-1">
              {summary.blockers.map((item, i) => (
                <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
                  ⚠ {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Recommendations */}
        <div>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "#A1A1AA" }}>
            AI Recommendations
          </h3>
          <ul className="space-y-1">
            {summary.recommendations.map((item, i) => (
              <li key={i} className="text-sm" style={{ color: "#A1A1AA" }}>
                💡 {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "#1A1A1A" }}>
        <Button
          onClick={copyMarkdown}
          className="w-full bg-[#3B82F6] hover:bg-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          aria-label="Copy summary as Markdown"
        >
          Copy Markdown
        </Button>
        <Button
          variant="outline"
          className="w-full border-[#52525B] hover:bg-[#1A1A1A] focus-visible:ring-2 focus-visible:ring-[#3B82F6] bg-transparent"
          style={{ color: "#FFFFFF" }}
          aria-label="Start next session with prefilled data"
        >
          Start Next Session
        </Button>
        <Button
          variant="ghost"
          className="w-full hover:bg-[#1A1A1A] focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          style={{ color: "#52525B" }}
          aria-label="Close and archive session"
        >
          Close / Archive
        </Button>
      </div>
    </div>
  )
}
