"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Terminal,
  Search,
  Calendar,
  Clock,
  CheckSquare,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ArchivedSession {
  session: {
    id: string
    name: string
    agenda: string
    duration: number
    creator: string
    createdAt: string
  }
  completedTasks: string[]
  incompleteTasks: string[]
  decisions: string[]
  blockers: string[]
  endedAt: string
  archivedAt: string
}

export default function ArchivePage() {
  const router = useRouter()
  const [archive, setArchive] = useState<ArchivedSession[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSession, setSelectedSession] = useState<ArchivedSession | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("z3ro-archive")
    if (stored) {
      setArchive(JSON.parse(stored))
    }
  }, [])

  const filteredArchive = archive.filter((item) => {
    const query = searchQuery.toLowerCase()
    return (
      item.session.name.toLowerCase().includes(query) ||
      item.session.agenda.toLowerCase().includes(query) ||
      item.decisions.some((d) => d.toLowerCase().includes(query))
    )
  })

  const deleteSession = (sessionId: string) => {
    const updatedArchive = archive.filter((item) => item.session.id !== sessionId)
    setArchive(updatedArchive)
    localStorage.setItem("z3ro-archive", JSON.stringify(updatedArchive))
    if (selectedSession?.session.id === sessionId) {
      setSelectedSession(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
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
            / archive
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs"
          style={{ color: "#52525B" }}
          onClick={() => router.push("/setup")}
        >
          new session
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel - Session list */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col border-r" style={{ borderColor: "#1A1A1A" }}>
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor: "#1A1A1A" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#52525B" }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agenda, decisions..."
                className="h-9 pl-10 bg-[#0D0D0D] border-[#262626] font-mono text-sm placeholder:text-[#3D3D3D] focus-visible:ring-1 focus-visible:ring-[#3B82F6]"
                style={{ color: "#FFFFFF" }}
              />
            </div>
          </div>

          {/* Session list */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredArchive.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="font-mono text-sm" style={{ color: "#52525B" }}>
                    {archive.length === 0 ? "No archived sessions yet" : "No matching sessions"}
                  </p>
                </div>
              ) : (
                filteredArchive.map((item) => (
                  <button
                    key={item.session.id}
                    onClick={() => setSelectedSession(item)}
                    className={`w-full p-3 rounded text-left transition-all ${
                      selectedSession?.session.id === item.session.id ? "widget-active-ring" : ""
                    }`}
                    style={{
                      backgroundColor: selectedSession?.session.id === item.session.id ? "#1A1A1A" : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate" style={{ color: "#FFFFFF" }}>
                          {item.session.name}
                        </h3>
                        <p className="text-xs truncate mt-0.5" style={{ color: "#52525B" }}>
                          {item.session.agenda}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3" style={{ color: "#3D3D3D" }} />
                          <span className="font-mono text-xs" style={{ color: "#3D3D3D" }}>
                            {formatDate(item.session.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#52525B" }} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel - Session details */}
        <div className="hidden md:flex flex-1 flex-col">
          {selectedSession ? (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Session header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h1 className="text-xl font-bold" style={{ color: "#FFFFFF" }}>
                      {selectedSession.session.name}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" style={{ color: "#52525B" }} />
                        <span className="font-mono" style={{ color: "#A1A1AA" }}>
                          {formatDate(selectedSession.session.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" style={{ color: "#52525B" }} />
                        <span className="font-mono" style={{ color: "#A1A1AA" }}>
                          {selectedSession.session.duration}m
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteSession(selectedSession.session.id)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
                  </Button>
                </div>

                {/* Agenda */}
                <div className="p-4 rounded border-l-2" style={{ backgroundColor: "#1A1A1A", borderColor: "#3B82F6" }}>
                  <p style={{ color: "#FFFFFF" }}>{selectedSession.session.agenda}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded" style={{ backgroundColor: "#1A1A1A" }}>
                    <div className="font-mono text-xl font-bold" style={{ color: "#10B981" }}>
                      {selectedSession.completedTasks.length}
                    </div>
                    <div className="font-mono text-xs" style={{ color: "#52525B" }}>
                      Done
                    </div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: "#1A1A1A" }}>
                    <div className="font-mono text-xl font-bold" style={{ color: "#F59E0B" }}>
                      {selectedSession.incompleteTasks.length}
                    </div>
                    <div className="font-mono text-xs" style={{ color: "#52525B" }}>
                      Pending
                    </div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: "#1A1A1A" }}>
                    <div className="font-mono text-xl font-bold" style={{ color: "#3B82F6" }}>
                      {selectedSession.decisions.length}
                    </div>
                    <div className="font-mono text-xs" style={{ color: "#52525B" }}>
                      Decisions
                    </div>
                  </div>
                  <div className="p-3 rounded" style={{ backgroundColor: "#1A1A1A" }}>
                    <div className="font-mono text-xl font-bold" style={{ color: "#EF4444" }}>
                      {selectedSession.blockers.length}
                    </div>
                    <div className="font-mono text-xs" style={{ color: "#52525B" }}>
                      Blockers
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                {(selectedSession.completedTasks.length > 0 || selectedSession.incompleteTasks.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" style={{ color: "#52525B" }} />
                      <h2 className="font-mono text-xs uppercase" style={{ color: "#52525B" }}>
                        Tasks
                      </h2>
                    </div>
                    <div className="space-y-1">
                      {selectedSession.completedTasks.map((task, i) => (
                        <div
                          key={`done-${i}`}
                          className="flex items-center gap-2 p-2 rounded"
                          style={{ backgroundColor: "#1A1A1A" }}
                        >
                          <CheckSquare className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
                          <span className="text-sm" style={{ color: "#A1A1AA" }}>
                            {task}
                          </span>
                        </div>
                      ))}
                      {selectedSession.incompleteTasks.map((task, i) => (
                        <div
                          key={`pending-${i}`}
                          className="flex items-center gap-2 p-2 rounded"
                          style={{ backgroundColor: "#1A1A1A" }}
                        >
                          <span className="text-sm shrink-0" style={{ color: "#52525B" }}>
                            [ ]
                          </span>
                          <span className="text-sm" style={{ color: "#52525B" }}>
                            {task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {selectedSession.decisions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" style={{ color: "#3B82F6" }} />
                      <h2 className="font-mono text-xs uppercase" style={{ color: "#3B82F6" }}>
                        Decisions
                      </h2>
                    </div>
                    <div className="space-y-1">
                      {selectedSession.decisions.map((decision, i) => (
                        <div
                          key={i}
                          className="p-2 rounded border-l-2"
                          style={{ backgroundColor: "#1A1A1A", borderColor: "#3B82F6" }}
                        >
                          <span className="text-sm" style={{ color: "#A1A1AA" }}>
                            {decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blockers */}
                {selectedSession.blockers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" style={{ color: "#EF4444" }} />
                      <h2 className="font-mono text-xs uppercase" style={{ color: "#EF4444" }}>
                        Blockers
                      </h2>
                    </div>
                    <div className="space-y-1">
                      {selectedSession.blockers.map((blocker, i) => (
                        <div
                          key={i}
                          className="p-2 rounded border-l-2"
                          style={{ backgroundColor: "#1A1A1A", borderColor: "#EF4444" }}
                        >
                          <span className="text-sm" style={{ color: "#A1A1AA" }}>
                            {blocker}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: "#262626" }} />
                <p className="font-mono text-sm" style={{ color: "#52525B" }}>
                  Select a session to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="h-6 flex items-center justify-between px-4 border-t font-mono text-xs"
        style={{ backgroundColor: "#0D0D0D", borderColor: "#1A1A1A", color: "#3D3D3D" }}
      >
        <span>{archive.length} archived sessions</span>
        <span>Read-only view</span>
      </footer>
    </div>
  )
}
