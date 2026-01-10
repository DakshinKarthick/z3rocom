import { NextResponse } from "next/server"

// Azure OpenAI configuration from environment
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview"

interface ExtractActionsRequest {
  messages?: string[]
  sessionName?: string
  agenda?: string
}

export interface ActionItem {
  task: string
  assignee?: string
  deadline?: string
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
 * 
 * POST /api/extract-actions
 * Body: { messages: string[], sessionName?: string, agenda?: string }
 * 
 * Returns: { actionItems: [...], decisions: [...], openQuestions: [...], success: boolean }
 */
export async function POST(req: Request) {
  try {
    const body: ExtractActionsRequest = await req.json()

    // Validate input
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Missing 'messages' array in request body", success: false },
        { status: 400 }
      )
    }

    if (body.messages.length === 0) {
      return NextResponse.json({
        actionItems: [],
        decisions: [],
        openQuestions: [],
        success: true,
      })
    }

    // Check Azure OpenAI configuration
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      console.error("[Extract Actions API] Missing Azure OpenAI configuration")
      return NextResponse.json({
        actionItems: [],
        decisions: [],
        openQuestions: [],
        success: false,
        error: "Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.",
      })
    }

    console.log(
      "[Extract Actions API] Processing",
      body.messages.length,
      "messages for session:",
      body.sessionName || "unnamed"
    )

    // Call Azure OpenAI
    const result = await extractActionsWithAzureOpenAI(
      body.messages,
      body.sessionName,
      body.agenda
    )

    console.log("[Extract Actions API] Extracted:", {
      actionItems: result.actionItems.length,
      decisions: result.decisions.length,
      openQuestions: result.openQuestions.length,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Extract Actions API] Error:", error)

    return NextResponse.json({
      actionItems: [],
      decisions: [],
      openQuestions: [],
      success: false,
      error: error instanceof Error ? error.message : "Extraction failed",
    }, { status: 500 })
  }
}

/**
 * Call Azure OpenAI to extract structured action items
 */
async function extractActionsWithAzureOpenAI(
  messages: string[],
  sessionName?: string,
  agenda?: string
): Promise<ExtractedActions> {
  // Combine messages into a single text block
  const chatContent = messages
    .filter(m => m && m.trim().length > 0)
    .map((m, i) => `[${i + 1}] ${m}`)
    .join("\n")

  const contextInfo = [
    sessionName ? `Session: "${sessionName}"` : null,
    agenda ? `Agenda: "${agenda}"` : null,
  ].filter(Boolean).join("\n")

  const systemPrompt = `You are an expert meeting assistant that extracts actionable information from team chat sessions.

Analyze the chat messages and extract:

1. **Action Items**: Tasks that need to be done. Look for:
   - Explicit assignments ("@John will...", "I'll handle...", "Can you...")
   - Commitments ("Let's do...", "We should...", "Need to...")
   - Include assignee if mentioned (name or "team"/"unassigned" if unclear)
   - Include deadline if mentioned

2. **Decisions**: Conclusions or agreements reached. Look for:
   - "Let's go with...", "We decided...", "Agreed to..."
   - Final choices between options
   - Consensus statements

3. **Open Questions**: Unresolved issues needing follow-up. Look for:
   - Questions without clear answers
   - "We still need to figure out...", "TBD", "to be discussed"
   - Deferred items

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "actionItems": [
    { "task": "description", "assignee": "name or null", "deadline": "date or null" }
  ],
  "decisions": ["decision 1", "decision 2"],
  "openQuestions": ["question 1", "question 2"]
}

Be concise. If nothing found for a category, use empty array [].`

  const userPrompt = `${contextInfo ? contextInfo + "\n\n" : ""}Chat messages:\n${chatContent}`

  // Build Azure OpenAI API URL
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY!,
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.2, // Lower temperature for more consistent structured output
      response_format: { type: "json_object" }, // Request JSON mode if supported
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Azure OpenAI] Error response:", response.status, errorText)
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  const content = data.choices?.[0]?.message?.content?.trim() || ""
  
  if (!content) {
    throw new Error("Azure OpenAI returned empty response")
  }

  // Parse the JSON response
  try {
    const parsed = JSON.parse(content)
    
    return {
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
      success: true,
    }
  } catch (parseError) {
    console.error("[Extract Actions] Failed to parse response:", content)
    throw new Error("Failed to parse AI response as JSON")
  }
}
