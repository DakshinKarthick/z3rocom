/**
 * Action Item Extractor Client Helper
 * ====================================
 * Calls the extract-actions API endpoint with messages from a session.
 * Uses Azure OpenAI to extract action items, decisions, and open questions.
 */

export interface ActionItem {
  task: string
  assignee?: string | null
  deadline?: string | null
}

export interface ExtractedActions {
  actionItems: ActionItem[]
  decisions: string[]
  openQuestions: string[]
  success: boolean
  error?: string
}

/**
 * Extract action items, decisions, and open questions from session messages
 * @param messages - Array of message contents to analyze
 * @param sessionName - Optional session name for context
 * @param agenda - Optional agenda for context
 * @returns Extracted actions with action items, decisions, and open questions
 */
export async function extractSessionActions(
  messages: string[],
  sessionName?: string,
  agenda?: string
): Promise<ExtractedActions> {
  try {
    if (!messages || messages.length === 0) {
      return {
        actionItems: [],
        decisions: [],
        openQuestions: [],
        success: true,
      }
    }

    const response = await fetch("/api/extract-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.filter((m) => m && m.trim().length > 0),
        sessionName,
        agenda,
      }),
    })

    if (!response.ok) {
      throw new Error(`Extract Actions API returned ${response.status}`)
    }

    const result = await response.json() as ExtractedActions
    return result
  } catch (error) {
    console.error("[extractSessionActions] Error:", error)
    return {
      actionItems: [],
      decisions: [],
      openQuestions: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
