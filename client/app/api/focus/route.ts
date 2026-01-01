import { spawn } from "child_process"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

// Path to the Python worker script
// process.cwd() returns the 'client' folder in Next.js
const WORKER_DIR = path.resolve(process.cwd(), "..", "worker")
const WORKER_PATH = path.join(WORKER_DIR, "focus_worker.py")

interface AnalyzeRequest {
  message?: string
  messages?: string[]
}

interface SingleAnalysisResult {
  focus_probability: number
  preprocessed: string
}

interface BatchAnalysisResult {
  focus_level: number
  probabilities: number[]
  message_count: number
}

/**
 * Analyze message(s) for focus level using Python ML model
 * 
 * POST /api/focus
 * Body: { message: string } - for single message
 *   or: { messages: string[] } - for batch analysis (newest first)
 * 
 * Returns: { focus_level: number, ... } for batch
 *      or: { focus_probability: number, ... } for single
 */
export async function POST(req: Request) {
  try {
    const body: AnalyzeRequest = await req.json()
    
    // Validate input
    if (!body.message && !body.messages) {
      return NextResponse.json(
        { error: "Missing 'message' or 'messages' in request body" },
        { status: 400 }
      )
    }

    // Check if worker script exists
    if (!fs.existsSync(WORKER_PATH)) {
      console.error("[Focus API] Worker script not found at:", WORKER_PATH)
      console.error("[Focus API] CWD:", process.cwd())
      return NextResponse.json({
        focus_level: 100,
        error: `Worker script not found at ${WORKER_PATH}`,
        fallback: true
      })
    }
    
    // Build command arguments
    const args: string[] = [WORKER_PATH]
    
    if (body.messages && body.messages.length > 0) {
      // Batch analysis mode
      args.push("--analyze-batch", ...body.messages)
    } else if (body.message) {
      // Single message analysis
      args.push("--analyze", body.message)
    }
    
    console.log("[Focus API] Running:", "python", args.join(" ").substring(0, 100) + "...")
    
    // Execute Python script
    const result = await runPythonScript(args)
    
    console.log("[Focus API] Result:", result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Focus API] Error:", error)
    
    // Return a default response on error (assume focused)
    return NextResponse.json({
      focus_level: 100,
      error: error instanceof Error ? error.message : "Analysis failed",
      fallback: true
    })
  }
}

function runPythonScript(args: string[]): Promise<SingleAnalysisResult | BatchAnalysisResult> {
  return new Promise((resolve, reject) => {
    // Use spawn without shell for proper argument handling
    // This avoids issues with paths containing spaces
    const python = spawn("python", args, {
      cwd: WORKER_DIR,
      env: {
        ...process.env,
        // Ensure Python uses UTF-8
        PYTHONIOENCODING: "utf-8",
      },
      // Don't use shell: true as it causes issues with spaces in paths
      windowsHide: true,
    })
    
    let stdout = ""
    let stderr = ""
    
    python.stdout.on("data", (data) => {
      stdout += data.toString()
    })
    
    python.stderr.on("data", (data) => {
      stderr += data.toString()
    })
    
    python.on("close", (code) => {
      if (code === 0) {
        try {
          // Parse the JSON output from Python
          const result = JSON.parse(stdout.trim())
          resolve(result)
        } catch (parseError) {
          console.error("[Focus API] Parse error:", stdout)
          reject(new Error(`Failed to parse Python output: ${stdout}`))
        }
      } else {
        console.error("[Focus API] Python stderr:", stderr)
        reject(new Error(`Python script exited with code ${code}: ${stderr}`))
      }
    })
    
    python.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`))
    })
    
    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill()
      reject(new Error("Python script timed out"))
    }, 30000)
  })
}
