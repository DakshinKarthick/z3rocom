"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Bot, User, Terminal, Users, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export type MessageType = "user" | "system" | "command-echo"

export interface Message {
  id: string
  type: MessageType
  author: string
  content: string
  timestamp: string
}

interface ChatStreamProps {
  messages: Message[]
  onAddMessage?: (message: Message) => void
}

export function ChatStream({ messages }: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [participants] = useState([
    { id: "1", name: "You", online: true },
    { id: "2", name: "System", online: true },
  ])

  // Auto-scroll with 400ms smooth behavior
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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50
    setIsAutoScrollEnabled(isAtBottom)
  }, [])

  const copyMessage = async (id: string, content: string) => {
    // Strip formatting for system messages
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Group consecutive messages from same author
  const groupedMessages = messages.reduce<{ messages: Message[]; showHeader: boolean }[]>((acc, msg, i) => {
    const prevMsg = messages[i - 1]
    const showHeader = !prevMsg || prevMsg.author !== msg.author || prevMsg.type !== msg.type

    if (showHeader) {
      acc.push({ messages: [msg], showHeader: true })
    } else {
      acc[acc.length - 1].messages.push(msg)
    }

    return acc
  }, [])

  const getMessageStyles = (type: MessageType) => {
    switch (type) {
      case "command-echo":
        return {
          authorColor: "#3b82f6",
          textColor: "#a1a1aa",
          bgColor: "transparent",
          font: "font-mono",
          icon: <Terminal className="h-3 w-3 text-[#3b82f6]" />,
        }
      case "system":
        return {
          authorColor: "#52525b",
          textColor: "#a1a1aa",
          bgColor: "transparent",
          font: "",
          icon: <Bot className="h-3 w-3 text-[#52525b]" />,
        }
      default:
        return {
          authorColor: "#52525b",
          textColor: "#52525b", // Tertiary to recede
          bgColor: "transparent",
          font: "",
          icon: <User className="h-3 w-3 text-[#52525b]" />,
        }
    }
  }

  return (
    <div className="flex flex-col w-full md:w-80 lg:w-96 shrink-0 border-l border-[#1a1a1f]">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-[#1a1a1f]">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 text-[#3f3f46]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#3f3f46]">Stream</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#111113]">
          <Users className="h-3 w-3 text-[#52525b]" />
          <span className="font-mono text-xs text-[#52525b]">{participants.length}</span>
        </div>
      </div>

      {/* Messages - max width 680px, narrower than widgets */}
      <ScrollArea ref={scrollRef} className="flex-1" onScrollCapture={handleScroll}>
        <div className="p-3 space-y-3">
          <div className="max-w-[680px]" role="log" aria-label="Chat messages" aria-live="polite">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-0.5">
                {group.messages.map((message, msgIndex) => {
                  const styles = getMessageStyles(message.type)
                  const showHeader = msgIndex === 0

                  return (
                    <div
                      key={message.id}
                      className="message-row group flex gap-2 py-1 rounded hover:bg-[#111113]/50 px-1 -mx-1"
                      role="article"
                      aria-label={`Message from ${message.author}`}
                    >
                      {/* Avatar - only show for first in group */}
                      <div className="w-5 shrink-0">
                        {showHeader && (
                          <div className="flex h-5 w-5 items-center justify-center rounded">{styles.icon}</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Author + timestamp header */}
                        {showHeader && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-medium" style={{ color: styles.authorColor }}>
                              {message.author}
                            </span>
                            <span className="font-mono text-xs text-[#3f3f46]">{message.timestamp}</span>
                          </div>
                        )}

                        {/* Content */}
                        <p className={`text-sm leading-relaxed ${styles.font}`} style={{ color: styles.textColor }}>
                          {message.content}
                        </p>
                      </div>

                      {/* Copy button - visible on hover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="copy-btn h-5 w-5 shrink-0"
                        onClick={() => copyMessage(message.id, message.content)}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-[#10b981]" />
                        ) : (
                          <Copy className="h-3 w-3 text-[#3f3f46]" />
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-8">
                <Terminal className="h-5 w-5 mx-auto mb-2 text-[#27272a]" />
                <p className="font-mono text-xs text-[#3f3f46]">No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
