"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { insertMessage, subscribeToMessages, listMessages } from "@/lib/supabase/chat"
import type { DbMessage } from "@/lib/supabase/model"

export default function TestRealtimePage() {
  const [sessionId, setSessionId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<DbMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState("Not connected")
  const [userId, setUserId] = useState("")

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id.substring(0, 8))
      }
    })
  }, [])

  const connect = async () => {
    if (!sessionId || !displayName) {
      alert("Please enter Session ID and Display Name")
      return
    }

    try {
      setStatus("Loading messages...")
      const msgs = await listMessages(sessionId)
      setMessages(msgs)
      setStatus("Subscribing to realtime...")
      
      const cleanup = subscribeToMessages(sessionId, (newMsg) => {
        console.log("Realtime message received:", newMsg)
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      
      setConnected(true)
      setStatus(`Connected as ${displayName}`)
      
      return cleanup
    } catch (error: any) {
      console.error("Connection error:", error)
      const errorMsg = error?.message || error?.error_description || JSON.stringify(error)
      setStatus(`Error: ${errorMsg}`)
      alert(`Connection failed: ${errorMsg}`)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !connected) return

    try {
      await insertMessage({
        sessionId,
        kind: "user",
        content: message,
        authorName: displayName,
      })
      setMessage("")
    } catch (error: any) {
      console.error("Send error:", error)
      const errorMsg = error?.message || error?.error_description || JSON.stringify(error)
      alert(`Failed: ${errorMsg}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-[#111113] border border-[#1a1a1f] rounded-lg p-6">
          <h1 className="text-2xl font-bold text-[#fafafa] mb-4">Realtime Test</h1>
          <p className="text-sm text-[#71717a] mb-4">User ID: {userId || "Loading..."}</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#fafafa] mb-2">Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full bg-[#0a0a0b] border border-[#27272a] rounded px-3 py-2 text-[#fafafa]"
                placeholder="Enter session ID"
                disabled={connected}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#fafafa] mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0a0a0b] border border-[#27272a] rounded px-3 py-2 text-[#fafafa]"
                placeholder="Your name"
                disabled={connected}
              />
            </div>
            
            <button
              onClick={connect}
              disabled={connected}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#27272a] text-white px-4 py-2 rounded font-medium"
            >
              {connected ? "Connected" : "Connect to Session"}
            </button>
            
            <div className="text-sm text-[#71717a]">Status: {status}</div>
          </div>
        </div>

        {connected && (
          <>
            <div className="bg-[#111113] border border-[#1a1a1f] rounded-lg p-6">
              <h2 className="text-lg font-bold text-[#fafafa] mb-4">Send Message</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-[#0a0a0b] border border-[#27272a] rounded px-3 py-2 text-[#fafafa]"
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-2 rounded font-medium"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="bg-[#111113] border border-[#1a1a1f] rounded-lg p-6">
              <h2 className="text-lg font-bold text-[#fafafa] mb-4">Messages ({messages.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-[#0a0a0b] border border-[#27272a] rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-[#3b82f6]">{msg.author_name}</span>
                      <span className="text-xs text-[#71717a]">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-[#fafafa]">{msg.content}</p>
                    <div className="text-xs text-[#71717a] mt-1">ID: {msg.id.substring(0, 8)}...</div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-[#71717a] py-8">No messages yet</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="bg-[#111113] border border-[#1a1a1f] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#fafafa] mb-2">How to Get Session ID</h2>
          <ol className="text-sm text-[#71717a] space-y-2 list-decimal list-inside mb-4">
            <li>Go to <a href="/setup" className="text-[#3b82f6] hover:underline">/setup</a> and create a new session</li>
            <li>After joining, open your browser DevTools (F12)</li>
            <li>In the Console tab, type: <code className="bg-[#0a0a0b] px-2 py-1 rounded">window.location.pathname</code></li>
            <li>Or check the Network tab for API calls to see the session UUID</li>
            <li>The Session ID is a UUID format: <code className="bg-[#0a0a0b] px-2 py-1 rounded text-xs">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code></li>
          </ol>
          
          <h2 className="text-lg font-bold text-[#fafafa] mb-2 mt-6">How to Test Realtime</h2>
          <ol className="text-sm text-[#71717a] space-y-2 list-decimal list-inside">
            <li>Open this page in two different browsers (Chrome + Firefox) or two incognito windows</li>
            <li>In both windows, enter the SAME Session ID (UUID format)</li>
            <li>Use different Display Names (e.g., "Alice" and "Bob")</li>
            <li>Click Connect in both windows</li>
            <li>Type a message in one window and press Send</li>
            <li>Check if the message appears in BOTH windows instantly (realtime working!)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
