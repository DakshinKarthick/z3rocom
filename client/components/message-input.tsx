"use client"

import type React from "react"

import { useState, useEffect, forwardRef } from "react"
import { Send, Paperclip, Clock, Target, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { LockState } from "@/app/page"

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
    {
      value: "/timer",
      label: "/timer",
      icon: Clock,
      description: "Start a focus timer (25/45/90 min)",
      disabled: false,
    },
    {
      value: "/agenda",
      label: "/agenda",
      icon: Target,
      description: "Set your agenda for today",
      disabled: false,
    },
    {
      value: "/tasks",
      label: "/tasks",
      icon: CheckSquare,
      description: "Create a task widget",
      disabled: false,
    },
    {
      value: "/end",
      label: "/end",
      icon: CheckSquare,
      description: "End session and show summary",
      disabled: false,
    },
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

      if (lockState === "soft" && deepWorkCommands.includes(command)) {
        return
      }

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

  const getBorderStyle = () => {
    if (lockState === "hard") {
      return {
        borderColor: "#EF4444",
        borderWidth: "2px",
        boxShadow: "0 0 0 2px #EF4444",
      }
    }
    if (lockState === "soft") {
      return {
        borderColor: "#F59E0B",
        borderWidth: "2px",
        boxShadow: "0 0 8px rgba(245, 158, 11, 0.5)",
      }
    }
    return {}
  }

  return (
    <div
      className="flex h-14 items-center gap-1 px-4"
      style={{ backgroundColor: "#1A1A1A" }}
      role="region"
      aria-label="Message input"
    >
      <div className="flex flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          disabled={lockState === "hard"}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" style={{ color: lockState === "hard" ? "#52525B" : "#A1A1AA" }} />
        </Button>

        <Popover open={showCommands} onOpenChange={setShowCommands}>
          <PopoverTrigger asChild>
            <div className="flex-1">
              <Input
                ref={ref}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  lockState === "hard"
                    ? "Chat locked - reduce distraction to unlock"
                    : lockState === "soft"
                      ? "Soft lock active - deep-work commands disabled"
                      : "Type a message or / for commands..."
                }
                disabled={lockState === "hard"}
                className="h-9 border-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6] transition-all"
                style={{
                  backgroundColor: "#262626",
                  color: "#FFFFFF",
                  ...getBorderStyle(),
                }}
                aria-label="Message input field"
                aria-describedby={lockState !== "none" ? "lock-status" : undefined}
              />
              {lockState !== "none" && (
                <span id="lock-status" className="sr-only">
                  {lockState === "hard"
                    ? "Chat is hard locked due to high distraction level"
                    : "Soft lock is active, deep work commands are disabled"}
                </span>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 border-0"
            style={{ backgroundColor: "#262626" }}
            align="start"
            side="top"
            sideOffset={8}
          >
            <Command style={{ backgroundColor: "#262626" }} className="border-0">
              <CommandList>
                <CommandEmpty style={{ color: "#52525B" }}>No commands found.</CommandEmpty>
                <CommandGroup>
                  {commands.map((command, index) => (
                    <CommandItem
                      key={command.value}
                      value={command.value}
                      onSelect={handleCommandSelect}
                      disabled={command.disabled}
                      className="focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                      style={{
                        backgroundColor: index === selectedIndex ? "#1A1A1A" : "transparent",
                        color: command.disabled ? "#52525B" : "#FFFFFF",
                        opacity: command.disabled ? 0.5 : 1,
                      }}
                    >
                      <command.icon className="mr-2 h-4 w-4" style={{ color: "#3B82F6" }} />
                      <div className="flex-1">
                        <div className="font-medium">{command.label}</div>
                        <div className="text-xs" style={{ color: "#52525B" }}>
                          {command.description}
                        </div>
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
          className="h-8 w-8 shrink-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          style={{
            backgroundColor: message.trim() && lockState !== "hard" ? "#3B82F6" : "#262626",
            color: "#FFFFFF",
          }}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
})
