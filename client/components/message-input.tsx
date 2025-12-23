"use client"

import type React from "react"
import { useState, useEffect, forwardRef } from "react"
import { Send, Terminal, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { LockState } from "@/components/app-header"

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

  const deepWorkCommands = ["/code", "/progress"]

  const commands = [
    { value: "/timer", label: "/timer", description: "Start focus timer", disabled: false },
    { value: "/agenda", label: "/agenda", description: "Set session agenda", disabled: false },
    { value: "/tasks", label: "/tasks", description: "Create task board", disabled: false },
    { value: "/decision", label: "/decision", description: "Log a decision", disabled: false },
    { value: "/blocker", label: "/blocker", description: "Flag a blocker", disabled: false },
    { value: "/code", label: "/code", description: "Open code snippet", disabled: lockState === "soft" },
    { value: "/progress", label: "/progress", description: "Progress check", disabled: lockState === "soft" },
    { value: "/next", label: "/next", description: "Plan next session", disabled: false },
    { value: "/end", label: "/end", description: "End session", disabled: false },
  ]

  useEffect(() => {
    if (message === "/") {
      setShowCommands(true)
      setSelectedIndex(0)
    } else if (!message.startsWith("/")) {
      setShowCommands(false)
    }
  }, [message])

  const handleSend = () => {
    if (!message.trim()) return
    if (lockState === "hard") return

    if (message.startsWith("/")) {
      const [command, ...args] = message.split(" ")
      if (lockState === "soft" && deepWorkCommands.includes(command)) return
      onExecuteCommand?.(command, args.join(" "))
      setMessage("")
      setShowCommands(false)
      return
    }

    onSendMessage?.(message)
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        if (!selectedCommand.disabled) {
          setMessage(selectedCommand.value + " ")
          setShowCommands(false)
        }
      } else if (e.key === "Escape") {
        setShowCommands(false)
      }
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCommandSelect = (commandValue: string) => {
    setMessage(commandValue + " ")
    setShowCommands(false)
  }

  const getInputStyle = () => {
    if (lockState === "hard") {
      return "border-[#ef4444] glow-red-pulse"
    }
    if (lockState === "soft") {
      return "border-[#f59e0b] glow-amber"
    }
    return "border-[#27272a] focus-visible:border-[#3b82f6]"
  }

  const getLockIcon = () => {
    if (lockState === "hard") {
      return <Lock className="h-4 w-4 text-[#ef4444] pulse-critical" />
    }
    if (lockState === "soft") {
      return <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
    }
    return <Terminal className="h-4 w-4 text-[#3b82f6]" />
  }

  const getPlaceholder = () => {
    if (lockState === "hard") return "LOCKED — complete agenda to unlock"
    if (lockState === "soft") return "SOFT LOCK — deep-work commands disabled"
    return "/ for commands..."
  }

  return (
    <div
      className="flex h-14 items-center gap-3 px-4 border-t border-[#1a1a1f] bg-[#0a0a0b]"
      role="region"
      aria-label="Command input"
    >
      <div className="flex items-center gap-2 shrink-0">
        {getLockIcon()}
        <span className="font-mono text-xs text-[#3f3f46] hidden sm:inline">$</span>
      </div>

      <Popover open={showCommands} onOpenChange={setShowCommands}>
        <PopoverTrigger asChild>
          <div className="flex-1">
            <Input
              ref={ref}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={lockState === "hard"}
              className={`h-9 bg-[#111113] font-mono text-sm text-[#fafafa] placeholder:text-[#3f3f46] focus-visible:ring-0 rounded-lg transition-all ${getInputStyle()}`}
              aria-label="Command input"
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 border border-[#27272a] bg-[#111113] rounded-lg shadow-2xl"
          align="start"
          side="top"
          sideOffset={8}
        >
          <Command className="bg-transparent">
            <CommandList className="max-h-64">
              <CommandEmpty className="py-3 px-4 font-mono text-sm text-[#52525b]">No commands found.</CommandEmpty>
              <CommandGroup>
                {commands.map((command, index) => (
                  <CommandItem
                    key={command.value}
                    value={command.value}
                    onSelect={handleCommandSelect}
                    disabled={command.disabled}
                    className={`py-2.5 px-4 cursor-pointer rounded-md mx-1 my-0.5 ${
                      index === selectedIndex ? "bg-[#1a1a1f]" : ""
                    } ${command.disabled ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <span
                        className="font-mono text-sm font-medium w-24"
                        style={{ color: command.disabled ? "#52525b" : "#3b82f6" }}
                      >
                        {command.label}
                      </span>
                      <span className="text-xs text-[#52525b] flex-1">{command.description}</span>
                      {command.disabled && <Lock className="h-3 w-3 text-[#f59e0b]" />}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        onClick={handleSend}
        disabled={!message.trim() || lockState === "hard"}
        size="icon"
        className="h-9 w-9 shrink-0 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#1a1a1f] disabled:opacity-50 rounded-lg focus-ring"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
})
