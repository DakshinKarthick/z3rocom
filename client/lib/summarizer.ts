/**
 * Session Summarizer Client Helper
 * ================================
 * Calls the summarize API endpoint with messages from a session.
 * Designed to be called when a session ends.
 */

export interface SummarizeResult {
  summary: string
  message_count: number
  max_sentences: number
  success: boolean
  error?: string
  fallback?: boolean
}

/**
 * Summarize session messages
 * @param messages - Array of message contents to summarize
 * @param maxSentences - Maximum sentences in summary (1-10, default 5)
 * @returns Summary result with summary text and metadata
 */
export async function summarizeSession(
  messages: string[],
  maxSentences: number = 5
): Promise<SummarizeResult> {
  try {
    if (!messages || messages.length === 0) {
      return {
        summary: "",
        message_count: 0,
        max_sentences: maxSentences,
        success: true,
      }
    }

    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.filter((m) => m && m.trim().length > 0),
        max_sentences: Math.min(Math.max(maxSentences, 1), 10),
      }),
    })

    if (!response.ok) {
      throw new Error(`Summarize API returned ${response.status}`)
    }

    const result = await response.json() as SummarizeResult
    return result
  } catch (error) {
    console.error("[summarizeSession] Error:", error)
    return {
      summary: "",
      message_count: 0,
      max_sentences: maxSentences,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: true,
    }
  }
}
