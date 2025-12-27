"use client"

import type React from "react"
import { useState, useEffect, forwardRef, useMemo } from "react"
import { Send, Lock, AlertTriangle, Sparkles, CornerDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { LockState } from "@/components/app-header"

// Signature accent color - matches chat-stream
const ACCENT = "#22d3ee" // cyan-400

interface MessageInputProps {
  onSendMessage?: (message: string) => void
  onExecuteCommand?: (command: string, args?: string) => void
  lockState?: LockState
}

export const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(function MessageInput(
  { onSendMessage, onExecuteCommand, lockState = "none" },
  ref,
) {
  const [message, setMessage] = useState("")
  const [showCommands, setShowCommands] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const deepWorkCommands = ["/code", "/progress"]

  // Memoize commands to prevent recreating on every render
  const commands = useMemo(() => [
    { value: "/timer", label: "/timer", description: "Start focus timer", disabled: false },
    { value: "/agenda", label: "/agenda", description: "Set session agenda", disabled: false, args: ["<text>"] },
    { value: "/tasks", label: "/tasks", description: "Create task board", disabled: false },
    { value: "/decision", label: "/decision", description: "Log a decision", disabled: false, args: ["<text>"] },
    { value: "/issues", label: "/issues", description: "Flag an issue", disabled: false, args: ["<text>"] },
    { value: "/code", label: "/code", description: "Open code snippet", disabled: lockState === "soft" },
    { value: "/progress", label: "/progress", description: "Progress check", disabled: lockState === "soft" },
    { value: "/next", label: "/next", description: "Plan next session", disabled: false },
    { value: "/end", label: "/end", description: "End session", disabled: false },
  ], [lockState])

  // Add global Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setShowCommands(true)
        if (ref && 'current' in ref && ref.current) {
          ref.current.focus()
          setMessage("/")
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [ref])

  useEffect(() => {
    // Don't auto-open menu, let user trigger it
    if (message.startsWith("/") && message.includes(" ")) {
      // Hide menu after space (command selected)
      setShowCommands(false)
      const [cmd] = message.split(" ")
      const found = commands.find((c) => c.value === cmd)
      setActiveCommand(found ? found.value : null)
    } else if (!message.startsWith("/")) {
      // Not a command at all
      setShowCommands(false)
      setActiveCommand(null)
    }
  }, [message])

  const handleSend = () => {
    if (!message.trim()) return

    if (message.startsWith("/")) {
      const [command, ...args] = message.split(" ")
      if (lockState === "soft" && deepWorkCommands.includes(command)) return
      onExecuteCommand?.(command, args.join(" "))
      setMessage("")
      setShowCommands(false)
      setActiveCommand(null)
      return
    }

    onSendMessage?.(message)
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Open command menu on down arrow when message starts with /
    if (!showCommands && message === "/" && e.key === "ArrowDown") {
      e.preventDefault()
      setShowCommands(true)
      setSelectedIndex(0)
      return
    }

    if (showCommands) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % commands.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selectedCommand = commands[selectedIndex]
        if (selectedCommand && !selectedCommand.disabled) {
          setMessage(selectedCommand.value + " ")
          setShowCommands(false)
          setActiveCommand(selectedCommand.value)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setShowCommands(false)
        setActiveCommand(null)
      }
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === "Escape") {
      setShowCommands(false)
      setActiveCommand(null)
    }
  }

  const handleCommandSelect = (commandValue: string) => {
    const cmd = commands.find(c => c.value === commandValue)
    if (cmd && !cmd.disabled) {
      setMessage(commandValue + " ")
      setShowCommands(false)
      setActiveCommand(commandValue)
    }
  }

  const getInputStyle = () => {
    if (lockState === "soft") {
      return "border-amber-500/40 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
    }
    if (isFocused) {
      return `border-[${ACCENT}]/50 shadow-[0_0_0_1px_${ACCENT}30]`
    }
    return "border-[#27272a] hover:border-[#3f3f46]"
  }

  const getLockIcon = () => {
    if (lockState === "soft") {
      return <AlertTriangle className="h-4 w-4 text-amber-400/80" />
    }
    return <Sparkles className="h-3.5 w-3.5 text-[#3f3f46]" />
  }

  const getPlaceholder = () => {
    if (lockState === "soft") return "Deep-work mode active — some commands disabled"
    return "Say something, or type / for commands..."
  }

  const getArgHint = () => {
    if (!activeCommand) return ""
    const spec = commands.find((c) => c.value === activeCommand)
    if (!spec || !spec.args) return ""
    const parts = message.trim().split(" ")
    const typedArgs = parts.slice(1)
    const remaining = spec.args.slice(typedArgs.length)
    return remaining.join(" ")
  }

  return (
    <div
      className="flex h-16 items-center gap-3 px-5 bg-[#09090b] border-t border-[#18181b]"
      role="region"
      aria-label="Message input"
    >
      {/* Subtle icon - not a button, just visual cue */}
      <div className="flex items-center shrink-0 opacity-60">
        {getLockIcon()}
      </div>

      <Popover open={showCommands} onOpenChange={setShowCommands}>
        <PopoverTrigger asChild>
          <div className="flex-1 relative">
            {/* Custom styled input for conversational feel */}
            <input
              ref={ref}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={getPlaceholder()}
              className={`
                w-full h-11 px-4 py-2
                bg-[#0f0f11] border rounded-xl
                font-mono text-[14px] text-[#e4e4e7] 
                placeholder:text-[#3f3f46] placeholder:font-normal
                focus:outline-none focus:ring-0
                transition-all duration-200
                ${getInputStyle()}
              `}
              style={{
                borderColor: isFocused && lockState !== "soft" ? ACCENT + "50" : undefined,
                boxShadow: isFocused && lockState !== "soft" ? `0 0 0 1px ${ACCENT}30` : undefined,
              }}
              aria-label="Message input"
            />
            
            {/* Arg hint below input */}
            {activeCommand && (
              <div className="absolute -bottom-5 left-4 text-[10px] font-mono text-[#3f3f46]" aria-live="polite">
                <span className="text-cyan-400/60">{activeCommand}</span> {getArgHint()}
              </div>
            )}
            
            {/* Keyboard hint - subtle */}
            {!message && !isFocused && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-40">
                <kbd className="font-mono text-[10px] text-[#52525b] px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a]">⌘K</kbd>
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="p-1 border border-[#27272a] bg-[#0f0f11] rounded-xl shadow-2xl min-w-[280px]"
          align="start"
          side="top"
          sideOffset={8}
        >
          <Command className="bg-transparent">
            <CommandList className="max-h-64">
              <CommandEmpty className="py-3 px-4 font-mono text-sm text-[#52525b]">No commands found</CommandEmpty>
              <CommandGroup>
                {commands.map((command, index) => (
                  <CommandItem
                    key={command.value}
                    value={command.value}
                    onSelect={handleCommandSelect}
                    disabled={command.disabled}
                    className={`
                      py-2.5 px-3 cursor-pointer rounded-lg mx-0.5 my-0.5 
                      transition-colors
                      ${index === selectedIndex ? "bg-[#18181b]" : "hover:bg-[#18181b]/60"} 
                      ${command.disabled ? "opacity-40 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Command glyph */}
                      <span className="font-mono text-[10px] text-[#3f3f46]">$</span>
                      <span
                        className="font-mono text-sm font-medium"
                        style={{ color: command.disabled ? "#52525b" : ACCENT }}
                      >
                        {command.label}
                      </span>
                      <span className="text-xs text-[#52525b] flex-1 ml-1">{command.description}</span>
                      {command.disabled && <Lock className="h-3 w-3 text-amber-400/60" />}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            {/* Hint at bottom of command menu */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#1a1a1f] mt-1">
              <span className="text-[10px] text-[#3f3f46]">Navigate with ↑↓</span>
              <div className="flex items-center gap-1 text-[10px] text-[#3f3f46]">
                <CornerDownLeft className="h-2.5 w-2.5" />
                <span>to select</span>
              </div>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        onClick={handleSend}
        disabled={!message.trim()}
        size="icon"
        className={`
          h-10 w-10 shrink-0 rounded-xl 
          transition-all duration-200
          disabled:bg-[#18181b] disabled:opacity-30
          ${message.trim() 
            ? 'bg-cyan-500/90 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20' 
            : ''
          }
        `}
        style={{
          backgroundColor: message.trim() ? ACCENT : undefined,
        }}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
})
