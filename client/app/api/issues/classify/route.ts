import { spawn } from "child_process"
import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

// Path to the Python worker script
// process.cwd() returns the 'client' folder in Next.js
const WORKER_DIR = path.resolve(process.cwd(), "..", "worker")
const WORKER_PATH = path.join(WORKER_DIR, "issue_classifier.py")

// Check if we're in a serverless environment (Vercel, etc.)
const IS_SERVERLESS = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

interface ClassifyRequest {
  text: string
}

interface ClassifyResult {
  priority: "high" | "medium" | "low"
  priority_confidence: number
  tags: string[]
  all_tag_scores: Record<string, number>
  error?: string
  fallback?: boolean
}

// Keywords for JS-based fallback classifier (used in serverless environments)
const PRIORITY_KEYWORDS = {
  high: [
    "crash", "down", "broken", "critical", "urgent", "security", "vulnerability",
    "production", "outage", "data loss", "cannot access", "blocked", "emergency",
    "asap", "immediately", "severe", "fatal", "exploit", "breach", "ddos"
  ],
  low: [
    "typo", "cosmetic", "minor", "nice to have", "enhancement", "suggestion",
    "refactor", "cleanup", "documentation", "readme", "style", "formatting",
    "comment", "rename", "trivial", "small", "simple fix"
  ]
}

const TAG_KEYWORDS: Record<string, string[]> = {
  database: ["database", "db", "sql", "query", "migration", "schema", "postgres", "mysql", "sqlite", "prisma", "orm", "table", "index"],
  api: ["api", "endpoint", "rest", "graphql", "route", "request", "response", "http", "fetch", "axios"],
  frontend: ["frontend", "ui", "ux", "component", "react", "vue", "angular", "css", "style", "layout", "button", "form", "modal"],
  backend: ["backend", "server", "node", "express", "fastify", "middleware", "controller", "service"],
  performance: ["performance", "slow", "memory", "leak", "optimization", "cache", "latency", "timeout", "speed"],
  security: ["security", "auth", "authentication", "authorization", "password", "token", "jwt", "xss", "csrf", "injection"],
  bug: ["bug", "error", "exception", "crash", "fix", "broken", "issue", "problem", "fail"],
  feature: ["feature", "add", "new", "implement", "enhancement", "request"],
}

/**
 * JavaScript-based fallback classifier for serverless environments
 */
function classifyWithJS(text: string): ClassifyResult {
  const lowerText = text.toLowerCase()
  
  // Determine priority
  let priority: "high" | "medium" | "low" = "medium"
  let priorityScore = 0.5
  
  const highMatches = PRIORITY_KEYWORDS.high.filter(kw => lowerText.includes(kw)).length
  const lowMatches = PRIORITY_KEYWORDS.low.filter(kw => lowerText.includes(kw)).length
  
  if (highMatches > lowMatches && highMatches > 0) {
    priority = "high"
    priorityScore = Math.min(0.5 + (highMatches * 0.15), 0.95)
  } else if (lowMatches > highMatches && lowMatches > 0) {
    priority = "low"
    priorityScore = Math.min(0.5 + (lowMatches * 0.15), 0.95)
  }
  
  // Determine tags
  const tags: string[] = []
  const allTagScores: Record<string, number> = {}
  
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw)).length
    if (matches > 0) {
      const score = Math.min(matches * 0.3, 0.95)
      allTagScores[tag] = score
      if (score >= 0.3) {
        tags.push(tag)
      }
    }
  }
  
  // Sort tags by score and take top 3
  const sortedTags = tags.sort((a, b) => (allTagScores[b] || 0) - (allTagScores[a] || 0)).slice(0, 3)
  
  return {
    priority,
    priority_confidence: priorityScore,
    tags: sortedTags,
    all_tag_scores: allTagScores,
    fallback: true
  }
}

/**
 * Classify issue text for priority and tags
 * 
 * POST /api/issues/classify
 * Body: { text: string }
 * 
 * Returns: { priority: "high", tags: ["database", "backend"], ... }
 */

// Handle CORS preflight
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: Request) {
  try {
    const body: ClassifyRequest = await req.json()
    
    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing 'text' in request body" },
        { status: 400 }
      )
    }

    // In serverless environments, use JS fallback
    if (IS_SERVERLESS) {
      console.log("[Issues Classify API] Using JS fallback (serverless environment)")
      const result = classifyWithJS(body.text)
      return NextResponse.json(result)
    }

    // Check if worker script exists (local development)
    if (!fs.existsSync(WORKER_PATH)) {
      console.error("[Issues Classify API] Worker not found at:", WORKER_PATH)
      console.error("[Issues Classify API] CWD:", process.cwd())
      console.log("[Issues Classify API] Falling back to JS classifier")
      const result = classifyWithJS(body.text)
      return NextResponse.json(result)
    }
    
    // Build command arguments (matching focus API pattern)
    const args: string[] = [WORKER_PATH, "--analyze", body.text]
    
    console.log("[Issues Classify API] Running:", "python", args[0].substring(args[0].length - 30) + " --analyze ...")
    
    // Execute Python script
    const result = await runPythonScript(args)
    
    console.log("[Issues Classify API] Result:", result)
    
    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error("[Issues Classify API] Error:", error)
    
    // Return fallback response using JS classifier
    try {
      const body = await req.clone().json()
      if (body.text) {
        const result = classifyWithJS(body.text)
        result.error = error instanceof Error ? error.message : "Python failed, using fallback"
        return NextResponse.json(result, {
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    } catch {
      // Can't parse body, return default
    }
    
    return NextResponse.json({
      priority: "medium",
      priority_confidence: 0.5,
      tags: [],
      all_tag_scores: {},
      error: error instanceof Error ? error.message : "Classification failed",
      fallback: true
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

function runPythonScript(args: string[]): Promise<ClassifyResult> {
  return new Promise((resolve, reject) => {
    // Use spawn without shell for proper argument handling
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
          console.error("[Issues Classify API] Parse error:", stdout)
          reject(new Error(`Failed to parse Python output: ${stdout}`))
        }
      } else {
        console.error("[Issues Classify API] Python stderr:", stderr)
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
