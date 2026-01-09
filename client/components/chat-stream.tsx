"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Terminal, Copy, Check, ChevronDown, Hash, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export type MessageType = "user" | "system" | "command-echo" | "creator"

export interface Message {
  id: string
  type: MessageType
  author: string
  content: string
  timestamp: string
  isCreator?: boolean
}

interface ChatStreamProps {
  messages: Message[]
  onAddMessage?: (message: Message) => void
}

// Terminal-style message type indicators
const TYPE_GLYPHS: Record<MessageType, string> = {
  user: "›",
  system: "#",
  "command-echo": "$",
  creator: "★",
}

// Signature accent color - Cyan for developer aesthetic
const ACCENT = "#22d3ee" // cyan-400

export function ChatStream({ messages }: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newestMessageId, setNewestMessageId] = useState<string | null>(null)

  // Track newest message for accent highlight
  useEffect(() => {
    if (messages.length > 0) {
      const newest = messages[messages.length - 1]
      setNewestMessageId(newest.id)
      const timer = setTimeout(() => setNewestMessageId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [messages])

  // Group consecutive messages from same sender
  const groupedMessages = useMemo(() => {
    return messages.reduce<{ messages: Message[]; author: string; type: MessageType }[]>((acc, msg, i) => {
      const prevMsg = messages[i - 1]
      const isSameGroup = prevMsg && prevMsg.author === msg.author && prevMsg.type === msg.type

      if (isSameGroup) {
        acc[acc.length - 1].messages.push(msg)
      } else {
        acc.push({ messages: [msg], author: msg.author, type: msg.type })
      }

      return acc
    }, [])
  }, [messages])

  // Auto-scroll with smooth behavior
  useEffect(() => {
    if (isAutoScrollEnabled && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        requestAnimationFrame(() => {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: messages.length <= 1 ? "auto" : "smooth",
          })
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
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Message styling based on type - user messages are dominant
  const getMessageStyles = (type: MessageType, isCreator?: boolean) => {
    if (isCreator) {
      return {
        authorColor: ACCENT,
        textColor: "#f4f4f5", // zinc-100 - high contrast
        glyphColor: ACCENT,
        opacity: "opacity-100",
        borderColor: `${ACCENT}30`,
      }
    }

    switch (type) {
      case "user":
        return {
          authorColor: "#a1a1aa", // zinc-400
          textColor: "#e4e4e7", // zinc-200 - readable
          glyphColor: "#71717a",
          opacity: "opacity-100",
          borderColor: "transparent",
        }
      case "command-echo":
        return {
          authorColor: "#3b82f6", // blue-500
          textColor: "#a1a1aa", // zinc-400
          glyphColor: "#3b82f6",
          opacity: "opacity-75",
          borderColor: "transparent",
        }
      case "system":
        return {
          authorColor: "#52525b", // zinc-600
          textColor: "#71717a", // zinc-500
          glyphColor: "#3f3f46",
          opacity: "opacity-60",
          borderColor: "transparent",
        }
      default:
        return {
          authorColor: "#a1a1aa",
          textColor: "#e4e4e7",
          glyphColor: "#71717a",
          opacity: "opacity-100",
          borderColor: "transparent",
        }
    }
  }

  const isUserType = (type: MessageType) => type === "user" || type === "creator"

  return (
    <div className="flex flex-col h-full min-w-0 relative bg-[#09090b] overflow-hidden">
      {/* Minimal header - conversation focused */}
      <div className="flex-shrink-0 flex items-center justify-between h-11 px-5 border-b border-[#18181b] bg-[#09090b]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-[#18181b]">
            <MessageSquare className="h-3.5 w-3.5 text-[#52525b]" />
          </div>
          <span className="text-sm font-medium text-[#71717a]">Session</span>
        </div>
        
        {/* Subtle message count */}
        <div className="flex items-center gap-1.5">
          <Hash className="h-3 w-3 text-[#3f3f46]" />
          <span className="font-mono text-xs text-[#3f3f46]">{messages.length}</span>
        </div>
      </div>

      {/* New messages indicator */}
      {!isAutoScrollEnabled && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => {
              const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]")
              if (scrollElement) {
                scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: "smooth" })
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-xs font-medium rounded-full shadow-xl hover:bg-[#1f1f23] transition-all group"
          >
            <span>Jump to latest</span>
            <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Messages area - the primary focus */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0" onScrollCapture={handleScroll}>
        <div 
          className="px-5 py-6 space-y-5 max-w-3xl mx-auto" 
          role="log" 
          aria-label="Chat messages" 
          aria-live="polite"
        >
          {groupedMessages.map((group, groupIndex) => {
            const styles = getMessageStyles(group.type, group.messages[0]?.isCreator)
            const isUser = isUserType(group.type)

            return (
              <div 
                key={groupIndex} 
                className={`message-group ${isUser ? 'pl-0' : 'pl-4'}`}
              >
                {/* Group header - author + first timestamp */}
                <div className="flex items-center gap-2 mb-2">
                  {/* Type glyph - terminal style */}
                  <span 
                    className="font-mono text-xs font-bold"
                    style={{ color: styles.glyphColor }}
                  >
                    {TYPE_GLYPHS[group.type]}
                  </span>
                  
                  {/* Author name */}
                  <span 
                    className="text-sm font-semibold tracking-tight"
                    style={{ color: styles.authorColor }}
                  >
                    {group.author}
                  </span>
                  
                  {/* Timestamp - muted and small */}
                  <span className="font-mono text-[10px] text-[#3f3f46] tabular-nums">
                    {group.messages[0].timestamp}
                  </span>
                </div>

                {/* Messages in group */}
                <div className="space-y-1.5 ml-5">
                  {group.messages.map((message, msgIndex) => {
                    const isNewest = message.id === newestMessageId
                    
                    return (
                      <div
                        key={message.id}
                        className={`
                          group relative flex items-start gap-3 py-1.5 px-3 -mx-3 rounded-md
                          transition-all duration-300 ease-out
                          hover:bg-[#18181b]/60
                          ${isNewest ? 'bg-[#18181b]/40' : ''}
                          ${styles.opacity}
                        `}
                        style={{
                          borderLeft: isNewest && isUser ? `2px solid ${ACCENT}` : `2px solid ${styles.borderColor}`,
                        }}
                        role="article"
                        aria-label={`Message from ${message.author}`}
                      >
                        {/* Message content - high readability */}
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-[14px] leading-[1.6] break-words font-mono selection:bg-cyan-500/20"
                            style={{ color: styles.textColor }}
                          >
                            {message.content}
                          </p>
                          
                          {/* Timestamp for non-first messages */}
                          {msgIndex > 0 && (
                            <span className="font-mono text-[9px] text-[#27272a] mt-0.5 block">
                              {message.timestamp}
                            </span>
                          )}
                        </div>

                        {/* Copy button - appears on hover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          onClick={() => copyMessage(message.id, message.content)}
                          aria-label="Copy message"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-[#52525b] hover:text-[#71717a]" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Empty state - inviting conversation */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-[#18181b] border border-[#27272a] mb-4">
                <Terminal className="h-6 w-6 text-[#3f3f46]" />
              </div>
              <p className="font-mono text-sm text-[#52525b] mb-1">Ready to collaborate</p>
              <p className="text-xs text-[#3f3f46] text-center max-w-[280px]">
                Start typing or use <span className="text-cyan-400/80 font-mono">/commands</span> to manage your session
              </p>
            </div>
          )}
          
          {/* Bottom padding */}
          <div className="h-6" aria-hidden="true" />
        </div>
      </ScrollArea>

      {/* Gradient fade at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #09090b 0%, transparent 100%)',
        }}
      />
    </div>
  )
}
