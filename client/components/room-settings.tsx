"use client"

import { useState, useEffect } from "react"
import { Users, Shield, LayoutGrid, Save, ChevronRight, Lock, Eye, EyeOff, Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

export interface RoomSettingsState {
  maxPeople: number
  allowInvites: boolean
  allowWidgetCreation: boolean
  readOnly: boolean
  restrictedWidgets: string[]
  sessionCreatorOnly: string[]
}

interface RoomSettingsProps {
  initial?: Partial<RoomSettingsState>
  onApply?: (settings: RoomSettingsState) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function RoomSettings({ initial, onApply, collapsed = false, onToggleCollapse }: RoomSettingsProps) {
  const [settings, setSettings] = useState<RoomSettingsState>({
    maxPeople: initial?.maxPeople ?? 8,
    allowInvites: initial?.allowInvites ?? true,
    allowWidgetCreation: initial?.allowWidgetCreation ?? true,
    readOnly: initial?.readOnly ?? false,
    restrictedWidgets: initial?.restrictedWidgets ?? ["code"],
    sessionCreatorOnly: initial?.sessionCreatorOnly ?? ["timer", "agenda"],
  })

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (collapsed !== undefined && onToggleCollapse) {
      localStorage.setItem("z3ro-settings-collapsed", String(collapsed))
    }
  }, [collapsed, onToggleCollapse])

  // Add keyboard shortcut (Ctrl+,)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault()
        onToggleCollapse?.()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onToggleCollapse])

  const apply = () => onApply?.(settings)

  if (collapsed) {
    return (
      <aside 
        className="flex w-12 shrink-0 flex-col border-l border-[#1a1a1f] bg-[#0a0a0b] items-center"
        role="complementary"
        aria-label="Room settings"
        aria-expanded="false"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="mt-3 h-8 w-8 rounded-lg hover:bg-[#18181b] transition-colors" 
          onClick={onToggleCollapse} 
          aria-label="Expand settings (Ctrl+,)"
        >
          <ChevronRight className="h-4 w-4 text-[#52525b]" />
        </Button>
      </aside>
    )
  }

  return (
    <aside 
      className="flex w-72 shrink-0 flex-col border-l border-[#1a1a1f] bg-[#0a0a0b] overflow-y-auto"
      role="complementary"
      aria-label="Room settings"
      aria-expanded="true"
    >
      {/* Header */}
      <div className="flex items-center gap-2 h-12 px-4 border-b border-[#1a1a1f] sticky top-0 bg-[#0a0a0b] z-10">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-medium text-sm text-[#fafafa]">Settings</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-md hover:bg-[#18181b] transition-colors" 
          onClick={onToggleCollapse} 
          aria-label="Collapse settings (Ctrl+,)"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-[#52525b]" />
        </Button>
      </div>

      <div className="p-4 space-y-5">
        {/* Capacity Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#71717a] uppercase tracking-wider">
            <Users className="h-3 w-3" />
            Capacity
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#111113] border border-[#1a1a1f]">
            <div className="flex-1">
              <label className="text-sm text-[#a1a1aa]">Max participants</label>
            </div>
            <Input
              type="number"
              min={1}
              max={99}
              value={settings.maxPeople}
              onChange={(e) => setSettings((s) => ({ ...s, maxPeople: Number(e.target.value) || 1 }))}
              className="w-16 h-8 bg-[#0a0a0b] border-[#27272a] font-mono text-sm text-[#fafafa] text-center"
            />
          </div>
        </div>

        {/* Permissions Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#71717a] uppercase tracking-wider">
            <Lock className="h-3 w-3" />
            Permissions
          </div>
          <div className="space-y-1 rounded-lg bg-[#111113] border border-[#1a1a1f] overflow-hidden">
            <div className="flex items-center justify-between p-3 hover:bg-[#18181b] transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#0a0a0b] flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#3b82f6]" />
                </div>
                <span className="text-sm text-[#fafafa]">Allow invites</span>
              </div>
              <Switch
                checked={settings.allowInvites}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, allowInvites: v }))}
              />
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-[#18181b] transition-colors border-t border-[#1a1a1f]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#0a0a0b] flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#f59e0b]" />
                </div>
                <span className="text-sm text-[#fafafa]">Widget creation</span>
              </div>
              <Switch
                checked={settings.allowWidgetCreation}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, allowWidgetCreation: v }))}
              />
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-[#18181b] transition-colors border-t border-[#1a1a1f]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#0a0a0b] flex items-center justify-center">
                  {settings.readOnly ? (
                    <EyeOff className="h-4 w-4 text-[#ef4444]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[#10b981]" />
                  )}
                </div>
                <span className="text-sm text-[#fafafa]">Read-only mode</span>
              </div>
              <Switch
                checked={settings.readOnly}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, readOnly: v }))}
              />
            </div>
          </div>
        </div>

        {/* Creator Controls Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#71717a] uppercase tracking-wider">
            <Shield className="h-3 w-3" />
            Creator-Only
          </div>
          <div className="space-y-2">
            {[
              { key: "timer", label: "Timer Controls", color: "#3b82f6" },
              { key: "agenda", label: "Agenda Updates", color: "#8b5cf6" },
              { key: "end", label: "End Session", color: "#ef4444" },
            ].map((w) => (
              <button
                key={w.key}
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    sessionCreatorOnly: s.sessionCreatorOnly.includes(w.key)
                      ? s.sessionCreatorOnly.filter((k) => k !== w.key)
                      : [...s.sessionCreatorOnly, w.key],
                  }))
                }
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  settings.sessionCreatorOnly.includes(w.key)
                    ? "bg-[#111113] border-[#27272a]"
                    : "bg-transparent border-transparent hover:bg-[#111113]/50"
                }`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: settings.sessionCreatorOnly.includes(w.key) ? w.color : "#3f3f46" }}
                />
                <span className={`text-sm ${settings.sessionCreatorOnly.includes(w.key) ? "text-[#fafafa]" : "text-[#71717a]"}`}>
                  {w.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Restricted Widgets Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#71717a] uppercase tracking-wider">
            <Lock className="h-3 w-3" />
            Restricted Widgets
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "tasks", label: "Tasks" },
              { key: "decision", label: "Decisions" },
              { key: "issues", label: "Issues" },
              { key: "code", label: "Code" },
              { key: "progress", label: "Progress" },
              { key: "next", label: "Next" },
            ].map((w) => (
              <button
                key={w.key}
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    restrictedWidgets: s.restrictedWidgets.includes(w.key)
                      ? s.restrictedWidgets.filter((k) => k !== w.key)
                      : [...s.restrictedWidgets, w.key],
                  }))
                }
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                  settings.restrictedWidgets.includes(w.key)
                    ? "bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]"
                    : "bg-transparent border-[#27272a] text-[#71717a] hover:border-[#3f3f46]"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <div className="pt-3 border-t border-[#1a1a1f]">
          <Button 
            onClick={apply} 
            className="w-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#2563eb] hover:to-[#7c3aed] text-white font-medium h-10 rounded-lg transition-all shadow-lg shadow-[#3b82f6]/20"
          >
            <Save className="h-4 w-4 mr-2" />
            Apply Settings
          </Button>
        </div>
      </div>
    </aside>
  )
}
