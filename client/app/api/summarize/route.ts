import { spawn } from "child_process"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

// Path to the Python worker script
const WORKER_DIR = path.resolve(process.cwd(), "..", "worker")
const WORKER_PATH = path.join(WORKER_DIR, "summarizer_worker.py")

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
 * Summarize session messages using Sumy LexRank algorithm
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

    if (body.messages.length === 0) {
      return NextResponse.json({
        summary: "",
        message_count: 0,
        max_sentences: body.max_sentences || 5,
        success: true,
      })
    }

    // Check if worker script exists
    if (!fs.existsSync(WORKER_PATH)) {
      console.error("[Summarize API] Worker script not found at:", WORKER_PATH)
      return NextResponse.json({
        summary: "",
        message_count: body.messages.length,
        max_sentences: body.max_sentences || 5,
        success: false,
        error: `Worker script not found at ${WORKER_PATH}`,
        fallback: true
      })
    }

    // Build command arguments
    const args: string[] = [WORKER_PATH]
    
    // Prepare JSON payload
    const payload = {
      messages: body.messages,
      max_sentences: Math.min(Math.max(body.max_sentences || 5, 1), 10)
    }
    
    args.push("--summarize-json", JSON.stringify(payload))

    console.log(
      "[Summarize API] Running summarizer with",
      body.messages.length,
      "messages, max_sentences:",
      payload.max_sentences
    )

    // Execute Python script
    const result = await runPythonScript(args)

    console.log("[Summarize API] Result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Summarize API] Error:", error)

    // Return error response
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

function runPythonScript(args: string[]): Promise<SummarizeResult> {
  return new Promise((resolve, reject) => {
    // Spawn Python process
    const python = spawn("python", args, {
      cwd: WORKER_DIR,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    })

    let stdout = ""
    let stderr = ""

    // Capture stdout
    python.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    // Capture stderr
    python.stderr?.on("data", (data) => {
      stderr += data.toString()
      console.log("[Summarize API] stderr:", data.toString())
    })

    // Handle process completion
    python.on("close", (code) => {
      try {
        // Try to parse JSON output
        const result = JSON.parse(stdout)
        
        if (code !== 0 && !result.success) {
          console.warn("[Summarize API] Process exited with code", code)
        }
        
        resolve(result as SummarizeResult)
      } catch (e) {
        console.error("[Summarize API] Failed to parse output:", stdout)
        reject(new Error(`Failed to parse summarizer output: ${e}`))
      }
    })

    python.on("error", (err) => {
      console.error("[Summarize API] Process error:", err)
      reject(err)
    })
  })
}
