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

export async function createWidget(sessionId: string, type: string, title: string) {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: instance, error: instanceErr } = await supabase
    .schema('widgets')
    .from('widget_instances')
    .insert({
      session_id: sessionId,
      widget_type: type,
      title,
      created_by: user.id,
    })
    .select()
    .single()

  if (instanceErr) throw instanceErr

  const { error: indexErr } = await supabase.from('widget_index').insert({
    session_id: sessionId,
    widget_type: type,
    widget_instance_id: instance.id,
    title,
    created_by: user.id,
  })

  if (indexErr) throw indexErr
  return instance
}

export async function getWidgetsBySession(sessionId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('widget_index')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addTaskItem(widgetId: string, text: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('task_items')
    .insert({ widget_id: widgetId, text })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTaskItem(id: string, updates: Partial<TaskItem>) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('task_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTaskItems(widgetId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('task_items')
    .select('*')
    .eq('widget_id', widgetId)
    .order('position', { ascending: true })

  if (error) throw error
  return data
}

export async function addDecision(widgetId: string, text: string) {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .schema('widgets')
    .from('decisions')
    .insert({ widget_id: widgetId, text, creator_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDecisions(widgetId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('decisions')
    .select('*')
    .eq('widget_id', widgetId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function addIssue(widgetId: string, text: string) {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .schema('widgets')
    .from('issues')
    .insert({ widget_id: widgetId, text, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIssue(id: string, resolved: boolean) {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const updates: any = { resolved }
  if (resolved && user) {
    updates.resolved_by = user.id
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .schema('widgets')
    .from('issues')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getIssues(widgetId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('issues')
    .select('*')
    .eq('widget_id', widgetId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function upsertCodeSnippet(widgetId: string, content: string, language?: string) {
  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .schema('widgets')
    .from('code_snippet')
    .upsert({
      widget_id: widgetId,
      content,
      language,
      last_editor_id: user?.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getCodeSnippet(widgetId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .schema('widgets')
    .from('code_snippet')
    .select('*')
    .eq('widget_id', widgetId)
    .single()

  if (error) throw error
  return data
}

export function subscribeToWidgetIndex(sessionId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`widget_index:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'widget_index',
        filter: `session_id=eq.${sessionId}`,
      },
      callback,
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToTaskItems(widgetId: string, callback: (payload: any) => void) {
  const supabase = getSupabaseBrowserClient()
  const channel = supabase
    .channel(`tasks:${widgetId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'widgets',
        table: 'task_items',
        filter: `widget_id=eq.${widgetId}`,
      },
      callback,
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(channel)
  }
}