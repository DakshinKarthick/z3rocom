export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          name: string
          agenda: string
          duration_minutes: number
          created_by: string
          created_at: string
          timer_ends_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          agenda: string
          duration_minutes: number
          created_by: string
          created_at?: string
          timer_ends_at?: string | null
        }
        Update: {
          code?: string
          name?: string
          agenda?: string
          duration_minutes?: number
          timer_ends_at?: string | null
        }
        Relationships: []
      }
      session_members: {
        Row: {
          id: string
          session_id: string
          user_id: string
          display_name: string
          joined_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          display_name: string
          joined_at?: string
        }
        Update: {
          display_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          session_id: string
          author_id: string
          author_name: string
          kind: "user" | "system" | "command-echo"
          content: string
          created_at: string
        }
        Insert: {
          id: string
          session_id: string
          author_id: string
          author_name: string
          kind: "user" | "system" | "command-echo"
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      session_preview: {
        Args: { p_code: string }
        Returns: Array<{
          id: string
          code: string
          name: string
          agenda: string
          duration_minutes: number
          created_at: string
          created_by: string
          timer_ends_at: string | null
        }>
      }
      session_member_count: {
        Args: { p_session_id: string }
        Returns: number
      }
    }
    Enums: {
      message_kind: "user" | "system" | "command-echo"
    }
    CompositeTypes: {}
  }
}
