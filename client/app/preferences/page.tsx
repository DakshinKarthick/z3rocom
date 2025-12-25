"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Terminal, Moon, Keyboard, Clock, Check, ArrowLeft, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

interface UserPreferences {
  theme: "dark" | "dark-neon"
  keybindings: "default" | "vim"
  timeFormat: "12h" | "24h"
}

const defaultPreferences: UserPreferences = {
  theme: "dark",
  keybindings: "default",
  timeFormat: "24h",
}

export default function PreferencesPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("z3ro-preferences")
    if (stored) {
      setPreferences(JSON.parse(stored))
    }
  }, [])

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    localStorage.setItem("z3ro-preferences", JSON.stringify(newPreferences))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col grid-bg" style={{ backgroundColor: "#0a0a0b" }}>
      <div className="scanline-overlay" />

      {/* Header */}
      <header className="h-12 flex items-center justify-between px-6 border-b border-[#1a1a1f]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#52525b] hover:text-[#a1a1aa]"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111113] border border-[#27272a]">
            <Terminal className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <span className="font-mono text-sm font-bold text-[#fafafa]">Z3RO</span>
          <span className="font-mono text-xs text-[#3f3f46]">/ preferences</span>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111113] border border-[#10b981]/30">
            <Check className="h-3 w-3 text-[#10b981]" />
            <span className="font-mono text-xs text-[#10b981]">Saved</span>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex justify-center p-6 overflow-auto">
        <div className="w-full max-w-lg space-y-8">
          <div>
            <h1 className="text-xl font-bold text-[#fafafa]">Preferences</h1>
            <p className="text-sm font-mono text-[#52525b] mt-1">Customize your Z3RO experience</p>
          </div>

          {/* Theme */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-[#3b82f6]" />
              <h2 className="font-mono text-sm uppercase tracking-wider text-[#fafafa]">Theme</h2>
            </div>

            <RadioGroup
              value={preferences.theme}
              onValueChange={(value) => updatePreference("theme", value as "dark" | "dark-neon")}
              className="space-y-2"
            >
              <div
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  preferences.theme === "dark" ? "bg-[#111113] border-[#3b82f6]" : "bg-[#0a0a0b] border-[#27272a]"
                }`}
                onClick={() => updatePreference("theme", "dark")}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="dark" id="dark" className="border-[#52525b]" />
                  <div>
                    <Label htmlFor="dark" className="font-medium text-[#fafafa] cursor-pointer">
                      Dark
                    </Label>
                    <p className="text-xs text-[#52525b] mt-0.5">Clean, minimal interface</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded bg-[#0a0a0b] border border-[#27272a]" />
                  <div className="w-4 h-4 rounded bg-[#111113]" />
                  <div className="w-4 h-4 rounded bg-[#3b82f6]" />
                </div>
              </div>

              <div
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  preferences.theme === "dark-neon"
                    ? "bg-[#111113] border-[#3b82f6] glow-blue"
                    : "bg-[#0a0a0b] border-[#27272a]"
                }`}
                onClick={() => updatePreference("theme", "dark-neon")}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="dark-neon" id="dark-neon" className="border-[#52525b]" />
                  <div>
                    <Label htmlFor="dark-neon" className="font-medium text-[#fafafa] cursor-pointer">
                      Dark + Neon
                    </Label>
                    <p className="text-xs text-[#52525b] mt-0.5">Enhanced glow effects</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Zap className="h-4 w-4 text-[#3b82f6]" />
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Keybindings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-[#3b82f6]" />
              <h2 className="font-mono text-sm uppercase tracking-wider text-[#fafafa]">Keybindings</h2>
            </div>

            <RadioGroup
              value={preferences.keybindings}
              onValueChange={(value) => updatePreference("keybindings", value as "default" | "vim")}
              className="space-y-2"
            >
              <div
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  preferences.keybindings === "default"
                    ? "bg-[#111113] border-[#3b82f6]"
                    : "bg-[#0a0a0b] border-[#27272a]"
                }`}
                onClick={() => updatePreference("keybindings", "default")}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="default" id="default-keys" className="border-[#52525b]" />
                  <div>
                    <Label htmlFor="default-keys" className="font-medium text-[#fafafa] cursor-pointer">
                      Default
                    </Label>
                    <p className="text-xs text-[#52525b] mt-0.5">Standard keyboard shortcuts</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#1a1a1f] text-xs font-mono text-[#a1a1aa]">/</kbd>
                  <kbd className="px-2 py-1 rounded bg-[#1a1a1f] text-xs font-mono text-[#a1a1aa]">Esc</kbd>
                </div>
              </div>

              <div
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  preferences.keybindings === "vim" ? "bg-[#111113] border-[#3b82f6]" : "bg-[#0a0a0b] border-[#27272a]"
                }`}
                onClick={() => updatePreference("keybindings", "vim")}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="vim" id="vim-keys" className="border-[#52525b]" />
                  <div>
                    <Label htmlFor="vim-keys" className="font-medium text-[#fafafa] cursor-pointer">
                      Vim-style
                    </Label>
                    <p className="text-xs text-[#52525b] mt-0.5">Modal navigation with j/k</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 rounded bg-[#1a1a1f] text-xs font-mono text-[#a1a1aa]">j</kbd>
                  <kbd className="px-2 py-1 rounded bg-[#1a1a1f] text-xs font-mono text-[#a1a1aa]">k</kbd>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Time Format */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#3b82f6]" />
              <h2 className="font-mono text-sm uppercase tracking-wider text-[#fafafa]">Time Format</h2>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#111113] border border-[#27272a]">
              <div>
                <Label className="font-medium text-[#fafafa]">24-hour time</Label>
                <p className="text-xs text-[#52525b] mt-0.5">
                  {preferences.timeFormat === "24h" ? "14:30 instead of 2:30 PM" : "2:30 PM instead of 14:30"}
                </p>
              </div>
              <Switch
                checked={preferences.timeFormat === "24h"}
                onCheckedChange={(checked) => updatePreference("timeFormat", checked ? "24h" : "12h")}
                className="data-[state=checked]:bg-[#3b82f6]"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#0a0a0b] border border-[#1a1a1f]">
              <p className="text-xs font-mono text-[#52525b]">
                Current time:{" "}
                <span className="text-[#fafafa]">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: preferences.timeFormat === "12h",
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="space-y-4 pt-4 border-t border-[#1a1a1f]">
            <h2 className="font-mono text-sm uppercase tracking-wider text-[#52525b]">Keyboard Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { action: "Open commands", key: "/" },
                { action: "Collapse widgets", key: "Esc" },
                { action: "Execute command", key: "Enter" },
                {
                  action: "Navigate menu",
                  key: preferences.keybindings === "vim" ? "j / k" : "↓ / ↑",
                },
              ].map(({ action, key }) => (
                <div key={action} className="flex items-center justify-between p-3 rounded-lg bg-[#111113]">
                  <span className="text-sm text-[#a1a1aa]">{action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#1a1a1f] text-xs font-mono text-[#fafafa]">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 flex items-center justify-center border-t border-[#1a1a1f]">
        <span className="font-mono text-xs text-[#3f3f46]">Changes are saved automatically</span>
      </footer>
    </div>
  )
}
