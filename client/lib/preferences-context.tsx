"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export interface UserPreferences {
  theme: "dark" | "dark-neon"
  keybindings: "default" | "vim"
  timeFormat: "12h" | "24h"
}

const defaultPreferences: UserPreferences = {
  theme: "dark",
  keybindings: "default",
  timeFormat: "24h",
}

interface PreferencesContextType {
  preferences: UserPreferences
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void
  formatTime: (date: Date) => string
  isNeonTheme: boolean
}

const PreferencesContext = createContext<PreferencesContextType | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("z3ro-preferences")
    if (stored) {
      try {
        setPreferences(JSON.parse(stored))
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsLoaded(true)
  }, [])

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    localStorage.setItem("z3ro-preferences", JSON.stringify(newPreferences))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: preferences.timeFormat === "12h",
    })
  }

  const isNeonTheme = preferences.theme === "dark-neon"

  // Show nothing during hydration to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
      </div>
    )
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, formatTime, isNeonTheme }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider")
  }
  return context
}
