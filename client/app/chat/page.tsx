"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// This route is deprecated - redirect to /session
export default function ChatPage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/session")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
        <span className="font-mono text-sm text-[#52525b]">Redirecting to session...</span>
      </div>
    </div>
  )
}
