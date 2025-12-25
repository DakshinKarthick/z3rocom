"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Terminal, ArrowRight, Users, Clock, Zap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const activeSession = sessionStorage.getItem("z3ro-session")
    if (activeSession) {
      router.push("/session")
    }
  }, [router])

  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col grid-bg" style={{ backgroundColor: "#0a0a0b" }}>
      <div className="scanline-overlay" />

      {/* Header */}
      <header className="h-12 flex items-center justify-between px-6 border-b border-[#1a1a1f]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#111113] border border-[#27272a]">
            <Terminal className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tight text-[#fafafa]">Z3RO</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#111113]"
            onClick={() => router.push("/archive")}
          >
            Archive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs text-[#52525b] hover:text-[#a1a1aa] hover:bg-[#111113]"
            onClick={() => router.push("/preferences")}
          >
            Settings
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full space-y-12">
          {/* Hero */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111113] border border-[#27272a]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-mono text-xs text-[#a1a1aa]">Ready to focus</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#fafafa]">
                Z<span className="text-[#3b82f6]">3</span>RO
              </h1>
              <p className="font-mono text-base text-[#52525b] max-w-md mx-auto">
                Command-driven focus sessions for deep work
              </p>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Clock, label: "Pomodoro+", desc: "25/45/90m presets" },
              { icon: Target, label: "Intent Lock", desc: "Agenda-first design" },
              { icon: Zap, label: "Commands", desc: "Keyboard-native" },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-4 rounded-xl bg-[#111113] border border-[#1a1a1f] hover:border-[#27272a] transition-colors"
              >
                <Icon className="h-5 w-5 text-[#3b82f6] mb-3" />
                <p className="font-medium text-sm text-[#fafafa]">{label}</p>
                <p className="font-mono text-xs text-[#52525b] mt-1">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/setup")}
              className="w-full h-14 font-mono text-base bg-[#3b82f6] hover:bg-[#2563eb] rounded-xl group"
            >
              <span>Start New Session</span>
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>

            <Button
              onClick={() => router.push("/join")}
              variant="outline"
              className="w-full h-12 font-mono border-[#27272a] hover:bg-[#111113] bg-transparent text-[#a1a1aa] rounded-xl"
            >
              <Users className="h-4 w-4 mr-2" />
              Join Existing Session
            </Button>
          </div>

          {/* Quick tip */}
          <div className="flex items-center justify-center gap-2 text-center">
            <kbd className="px-2 py-1 rounded bg-[#111113] border border-[#27272a] font-mono text-xs text-[#52525b]">
              /
            </kbd>
            <span className="font-mono text-xs text-[#3f3f46]">opens command palette during sessions</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 flex items-center justify-center px-6 border-t border-[#1a1a1f]">
        <span className="font-mono text-xs text-[#3f3f46]">Focus. Execute. Ship.</span>
      </footer>
    </div>
  )
}
