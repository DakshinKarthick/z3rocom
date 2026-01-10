import { NextResponse } from "next/server"

// Azure OpenAI configuration from environment
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini"
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview"

interface SummarizeRequest {
  messages?: string[]
  max_sentences?: number
}

interface SummarizeResult {
  summary: string
  message_count: number
  max_sentences: number
  success: boolean
  error?: string
  fallback?: boolean
}

/**
 * Summarize session messages using Azure OpenAI
 * 
 * POST /api/summarize
 * Body: { messages: string[], max_sentences?: number }
 * 
 * Returns: { summary: string, message_count: number, ... }
 */
export async function POST(req: Request) {
  try {
    const body: SummarizeRequest = await req.json()

    // Validate input
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Missing 'messages' array in request body", summary: "", success: false },
        { status: 400 }
      )
    }

    const maxSentences = Math.min(Math.max(body.max_sentences || 5, 1), 10)

    if (body.messages.length === 0) {
      return NextResponse.json({
        summary: "",
        message_count: 0,
        max_sentences: maxSentences,
        success: true,
      })
    }

    // Check Azure OpenAI configuration
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
      console.error("[Summarize API] Missing Azure OpenAI configuration")
      return NextResponse.json({
        summary: "",
        message_count: body.messages.length,
        max_sentences: maxSentences,
        success: false,
        error: "Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.",
        fallback: true
      })
    }

    console.log(
      "[Summarize API] Summarizing",
      body.messages.length,
      "messages with Azure OpenAI, max_sentences:",
      maxSentences
    )

    // Call Azure OpenAI
    const summary = await summarizeWithAzureOpenAI(body.messages, maxSentences)

    const result: SummarizeResult = {
      summary,
      message_count: body.messages.length,
      max_sentences: maxSentences,
      success: true,
    }

    console.log("[Summarize API] Result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Summarize API] Error:", error)

    return NextResponse.json({
      summary: "",
      message_count: 0,
      max_sentences: 5,
      success: false,
      error: error instanceof Error ? error.message : "Summarization failed",
      fallback: true
    }, { status: 500 })
  }
}

/**
 * Call Azure OpenAI Chat Completions API for summarization
 */
async function summarizeWithAzureOpenAI(messages: string[], maxSentences: number): Promise<string> {
  // Combine messages into a single text block
  const chatContent = messages
    .filter(m => m && m.trim().length > 0)
    .map((m, i) => `[${i + 1}] ${m}`)
    .join("\n")

  const systemPrompt = `You are a concise summarizer for team chat sessions. 
Summarize the key discussion points, decisions made, and action items from the chat messages.
Keep the summary to ${maxSentences} sentences maximum.
Focus on: topics discussed, conclusions reached, and any tasks or next steps mentioned.
Be direct and factual. Do not include pleasantries or filler.`

  const userPrompt = `Summarize this chat session:\n\n${chatContent}`

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
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more focused summaries
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Azure OpenAI] Error response:", response.status, errorText)
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  const summary = data.choices?.[0]?.message?.content?.trim() || ""
  
  if (!summary) {
    throw new Error("Azure OpenAI returned empty response")
  }

  return summary
}
