"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Bot, User, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  author: string
  content: string
  timestamp: string
}

interface ChatStreamProps {
  messages: Message[]
  onAddMessage?: (message: Message) => void
}

export function ChatStream({ messages, onAddMessage }: ChatStreamProps) {
  const [isVisible, setIsVisible] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const [participants] = useState([
    { id: "1", name: "You", online: true },
    { id: "2", name: "Assistant", online: true },
  ])

  useEffect(() => {
    if (isAutoScrollEnabled && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: "smooth",
        })
      }
    }
  }, [messages, isAutoScrollEnabled])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50
    setIsAutoScrollEnabled(isAtBottom)
  }

  if (!isVisible) return null

  return (
    <div className="relative flex flex-1 flex-col p-1" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="flex h-full flex-col rounded-md" style={{ backgroundColor: "#1A1A1A" }}>
        {/* Header */}
        <div
          className="flex items-center justify-between border-b p-3"
          style={{ borderColor: "#262626" }}
          role="region"
          aria-label="Chat stream header"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" style={{ color: "#3B82F6" }} />
            <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
              Chat Stream
            </span>
            <Badge
              variant="secondary"
              className="h-5 px-2 text-xs border-0 flex items-center gap-1"
              style={{
                backgroundColor: "#262626",
                color: "#A1A1AA",
              }}
            >
              <Users className="h-3 w-3" />
              {participants.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 focus-visible:ring-2 focus-visible:ring-[#3B82F6] hidden md:flex"
            onClick={() => setIsVisible(false)}
            aria-label="Close chat stream"
          >
            <X className="h-3 w-3" style={{ color: "#A1A1AA" }} />
          </Button>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1" onScrollCapture={handleScroll}>
          <div className="flex flex-col items-center p-3">
            <div className="w-full max-w-[680px] space-y-1" role="log" aria-label="Chat messages" aria-live="polite">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex gap-2 py-1"
                  role="article"
                  aria-label={`Message from ${message.author}`}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                    style={{
                      backgroundColor:
                        message.role === "assistant" ? "#262626" : message.role === "system" ? "#1A1A1A" : "#3B82F6",
                    }}
                  >
                    {message.role === "assistant" ? (
                      <Bot className="h-3 w-3" style={{ color: "#3B82F6" }} />
                    ) : message.role === "system" ? (
                      <span className="text-xs" style={{ color: "#52525B" }}>
                        •
                      </span>
                    ) : (
                      <User className="h-3 w-3" style={{ color: "#FFFFFF" }} />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium" style={{ color: "#A1A1AA" }}>
                        {message.author}
                      </span>
                      <span className="font-mono text-xs" style={{ color: "#52525B" }}>
                        {message.timestamp}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
