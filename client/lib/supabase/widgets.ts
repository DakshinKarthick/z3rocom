import { getSupabaseBrowserClient } from './client'

export interface WidgetInstance {
  id: string
  session_id: string
  widget_type: 'tasks' | 'decision' | 'issues' | 'code' | 'progress' | 'next'
  title: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskItem {
  id: string
  widget_id: string
  text: string
  completed: boolean
  position: number
  created_at: string
}

export interface Decision {
  id: string
  widget_id: string
  text: string
  creator_id: string
  created_at: string
}

export interface Issue {
  id: string
  widget_id: string
  text: string
  resolved: boolean
  created_by: string
  created_at: string
  resolved_by?: string
  resolved_at?: string
}

export interface CodeSnippet {
  widget_id: string
  language?: string
  content: string
  locked: boolean
  last_editor_id?: string
  updated_at: string
}

/**
 * Create a widget - stores in widgets.widget_instances with realtime sync
 */
export async function createWidget(sessionId: string, type: string, title: string): Promise<WidgetInstance> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Not authenticated")

  console.log('[createWidget] Creating widget:', { sessionId, type, title, userId: user.id })

  // Insert into widgets.widget_instances (now that schema is exposed)
  const { data: instance, error: instanceErr } = await (supabase as any)
    .schema("widgets")
    .from("widget_instances")
    .insert({
      session_id: sessionId,
      widget_type: type,
      title,
      created_by: user.id,
    })
    .select()
    .single()

  if (instanceErr) {
    console.error('[createWidget] Failed to create widget_instances:', instanceErr)
    throw new Error(`Database error: ${instanceErr.message || instanceErr.code || 'Unknown error'}`)
  }

  if (!instance) throw new Error("Failed to create widget instance - no data returned")
  console.log('[createWidget] Widget created successfully:', instance.id)
  return instance
}

/**
 * Get all widgets for a session from widgets.widget_instances
 */
export async function getWidgetsBySession(sessionId: string): Promise<WidgetInstance[]> {
  const supabase = getSupabaseBrowserClient()
  console.log('[getWidgetsBySession] Loading widgets for session:', sessionId)
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("widget_instances")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error('[getWidgetsBySession] Failed to load widgets:', error)
    throw new Error(`Load error: ${error.message || error.code || 'Unknown error'}`)
  }
  
  console.log('[getWidgetsBySession] Loaded widgets:', data?.length || 0)
  return data || []
}

/**
 * Delete a widget
 */
export async function deleteWidget(widgetId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  // Delete from widgets.widget_instances (cascade deletes related data)
  const { error } = await (supabase as any)
    .schema("widgets")
    .from("widget_instances")
    .delete()
    .eq("id", widgetId)

  if (error) {
    console.error('[deleteWidget] Failed:', error)
    throw new Error(`Delete error: ${error.message || 'Unknown error'}`)
  }

  console.log('[deleteWidget] Widget deleted:', widgetId)
}

// ============================================================================
// Task Items - Full realtime support
// ============================================================================

export async function addTaskItem(widgetId: string, text: string): Promise<TaskItem> {
  const supabase = getSupabaseBrowserClient()
  
  // Get current max position
  const { data: existing } = await (supabase as any)
    .schema("widgets")
    .from("task_items")
    .select("position")
    .eq("widget_id", widgetId)
    .order("position", { ascending: false })
    .limit(1)

  const position = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("task_items")
    .insert({
      widget_id: widgetId,
      text,
      position,
    })
    .select()
    .single()

  if (error) {
    console.error('[addTaskItem] Failed:', error)
    throw new Error(`Task error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addTaskItem] Task added:', data.id)
  return data
}

export async function updateTaskItem(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("task_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error('[updateTaskItem] Failed:', error)
    throw new Error(`Update error: ${error.message || 'Unknown error'}`)
  }

  console.log('[updateTaskItem] Task updated:', id)
  return data
}

export async function getTaskItems(widgetId: string): Promise<TaskItem[]> {
  if (!widgetId || widgetId === 'undefined') {
    console.error('[getTaskItems] Invalid widgetId:', widgetId)
    throw new Error(`Invalid widget ID: ${widgetId}`)
  }
  
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("task_items")
    .select("*")
    .eq("widget_id", widgetId)
    .order("position", { ascending: true })

  if (error) {
    console.error('[getTaskItems] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

export async function deleteTaskItem(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await (supabase as any)
    .schema("widgets")
    .from("task_items")
    .delete()
    .eq("id", id)

  if (error) {
    console.error('[deleteTaskItem] Failed:', error)
    throw new Error(`Delete error: ${error.message || 'Unknown error'}`)
  }

  console.log('[deleteTaskItem] Task deleted:', id)
}

// ============================================================================
// Decisions - Full realtime support
// ============================================================================

export async function addDecision(widgetId: string, text: string): Promise<Decision> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("decisions")
    .insert({
      widget_id: widgetId,
      text,
      creator_id: user?.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[addDecision] Failed:', error)
    throw new Error(`Decision error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addDecision] Decision added:', data.id)
  return data
}

export async function getDecisions(widgetId: string): Promise<Decision[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("decisions")
    .select("*")
    .eq("widget_id", widgetId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[getDecisions] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

export async function deleteDecision(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await (supabase as any)
    .schema("widgets")
    .from("decisions")
    .delete()
    .eq("id", id)

  if (error) {
    console.error('[deleteDecision] Failed:', error)
    throw new Error(`Delete error: ${error.message || 'Unknown error'}`)
  }

  console.log('[deleteDecision] Decision deleted:', id)
}

// ============================================================================
// Issues - Full realtime support
// ============================================================================

export async function addIssue(widgetId: string, text: string): Promise<Issue> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("issues")
    .insert({
      widget_id: widgetId,
      text,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[addIssue] Failed:', error)
    throw new Error(`Issue error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addIssue] Issue added:', data.id)
  return data
}

export async function updateIssue(id: string, resolved: boolean): Promise<Issue> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const updates: any = { resolved }
  if (resolved && user) {
    updates.resolved_by = user.id
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("issues")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error('[updateIssue] Failed:', error)
    throw new Error(`Update error: ${error.message || 'Unknown error'}`)
  }

  console.log('[updateIssue] Issue updated:', id)
  return data
}

export async function getIssues(widgetId: string): Promise<Issue[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("issues")
    .select("*")
    .eq("widget_id", widgetId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[getIssues] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

export async function deleteIssue(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await (supabase as any)
    .schema("widgets")
    .from("issues")
    .delete()
    .eq("id", id)

  if (error) {
    console.error('[deleteIssue] Failed:', error)
    throw new Error(`Delete error: ${error.message || 'Unknown error'}`)
  }

  console.log('[deleteIssue] Issue deleted:', id)
}

// ============================================================================
// Code Snippets - Full realtime support
// ============================================================================

export async function upsertCodeSnippet(widgetId: string, content: string, language?: string): Promise<CodeSnippet> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("code_snippet")
    .upsert({
      widget_id: widgetId,
      content,
      language,
      last_editor_id: user?.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[upsertCodeSnippet] Failed:', error)
    throw new Error(`Code error: ${error.message || 'Unknown error'}`)
  }

  console.log('[upsertCodeSnippet] Code snippet saved:', widgetId)
  return data
}

export async function getCodeSnippet(widgetId: string): Promise<CodeSnippet | null> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("code_snippet")
    .select("*")
    .eq("widget_id", widgetId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('[getCodeSnippet] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || null
}

// ============================================================================
// Progress - Full realtime support
// ============================================================================

export async function addProgressPrompt(widgetId: string, promptText: string): Promise<any> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("progress_prompts")
    .insert({
      widget_id: widgetId,
      prompt_text: promptText,
    })
    .select()
    .single()

  if (error) {
    console.error('[addProgressPrompt] Failed:', error)
    throw new Error(`Prompt error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addProgressPrompt] Prompt added:', data.id)
  return data
}

export async function addProgressResponse(promptId: string, responseText: string): Promise<any> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("progress_responses")
    .insert({
      prompt_id: promptId,
      user_id: user?.id,
      response_text: responseText,
    })
    .select()
    .single()

  if (error) {
    console.error('[addProgressResponse] Failed:', error)
    throw new Error(`Response error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addProgressResponse] Response added:', data.id)
  return data
}

export async function getProgressPrompts(widgetId: string): Promise<any[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("progress_prompts")
    .select("*")
    .eq("widget_id", widgetId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error('[getProgressPrompts] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

export async function getProgressResponses(promptId: string): Promise<any[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("progress_responses")
    .select("*")
    .eq("prompt_id", promptId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error('[getProgressResponses] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

// ============================================================================
// Next Session Seed - Full realtime support
// ============================================================================

export async function createNextSessionSeed(widgetId: string, proposedGoal: string, durationMinutes: number): Promise<any> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("next_session_seed")
    .insert({
      widget_id: widgetId,
      proposed_goal: proposedGoal,
      duration_minutes: durationMinutes,
    })
    .select()
    .single()

  if (error) {
    console.error('[createNextSessionSeed] Failed:', error)
    throw new Error(`Seed error: ${error.message || 'Unknown error'}`)
  }

  console.log('[createNextSessionSeed] Seed created:', data.widget_id)
  return data
}

export async function addSeedIssue(seedWidgetId: string, issueId: string, selected: boolean = true): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  
  const { error } = await (supabase as any)
    .schema("widgets")
    .from("next_seed_issues")
    .upsert({
      seed_widget_id: seedWidgetId,
      issue_id: issueId,
      selected,
    })

  if (error) {
    console.error('[addSeedIssue] Failed:', error)
    throw new Error(`Seed issue error: ${error.message || 'Unknown error'}`)
  }

  console.log('[addSeedIssue] Seed issue updated:', seedWidgetId, issueId)
}

export async function getNextSessionSeed(widgetId: string): Promise<any | null> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("next_session_seed")
    .select("*")
    .eq("widget_id", widgetId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('[getNextSessionSeed] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || null
}

export async function getSeedIssues(seedWidgetId: string): Promise<any[]> {
  const supabase = getSupabaseBrowserClient()
  
  const { data, error } = await (supabase as any)
    .schema("widgets")
    .from("next_seed_issues")
    .select("*")
    .eq("seed_widget_id", seedWidgetId)

  if (error) {
    console.error('[getSeedIssues] Failed:', error)
    throw new Error(`Load error: ${error.message || 'Unknown error'}`)
  }

  return data || []
}

// ============================================================================
// Realtime Subscriptions - Now works with widgets schema
// ============================================================================

export function subscribeToWidgets(sessionId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`widgets:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "widgets",
        table: "widget_instances",
        filter: `session_id=eq.${sessionId}`,
      },
      callback,
    )
    .subscribe()

  console.log('[subscribeToWidgets] Subscribed to session:', sessionId)
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToTaskItems(widgetId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`tasks:${widgetId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "widgets",
        table: "task_items",
        filter: `widget_id=eq.${widgetId}`,
      },
      callback,
    )
    .subscribe()

  console.log('[subscribeToTaskItems] Subscribed to widget:', widgetId)
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToDecisions(widgetId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`decisions:${widgetId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "widgets",
        table: "decisions",
        filter: `widget_id=eq.${widgetId}`,
      },
      callback,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToIssues(widgetId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`issues:${widgetId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "widgets",
        table: "issues",
        filter: `widget_id=eq.${widgetId}`,
      },
      callback,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToCodeSnippet(widgetId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`code:${widgetId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "widgets",
        table: "code_snippet",
        filter: `widget_id=eq.${widgetId}`,
      },
      callback,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
