export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      event_seen_on: {
        Row: {
          event_id: string
          first_seen_at: string | null
          relay: string
        }
        Insert: {
          event_id: string
          first_seen_at?: string | null
          relay: string
        }
        Update: {
          event_id?: string
          first_seen_at?: string | null
          relay?: string
        }
        Relationships: []
      }
      event_tags: {
        Row: {
          event_id: string
          tag: string
          tag_id: number
          v0: string | null
          v1: string | null
          v2: string | null
          v3: string | null
        }
        Insert: {
          event_id: string
          tag: string
          tag_id?: number
          v0?: string | null
          v1?: string | null
          v2?: string | null
          v3?: string | null
        }
        Update: {
          event_id?: string
          tag?: string
          tag_id?: number
          v0?: string | null
          v1?: string | null
          v2?: string | null
          v3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          content: string
          created_at: number
          id: string
          keep: Database["public"]["Enums"]["retention_class"] | null
          kind: number
          last_touched: string | null
          pubkey: string
          relay: string | null
          seen_at: string | null
          sig: string
        }
        Insert: {
          content: string
          created_at: number
          id: string
          keep?: Database["public"]["Enums"]["retention_class"] | null
          kind: number
          last_touched?: string | null
          pubkey: string
          relay?: string | null
          seen_at?: string | null
          sig: string
        }
        Update: {
          content?: string
          created_at?: number
          id?: string
          keep?: Database["public"]["Enums"]["retention_class"] | null
          kind?: number
          last_touched?: string | null
          pubkey?: string
          relay?: string | null
          seen_at?: string | null
          sig?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          follows: string
          updated_at: string | null
          who: string
        }
        Insert: {
          follows: string
          updated_at?: string | null
          who: string
        }
        Update: {
          follows?: string
          updated_at?: string | null
          who?: string
        }
        Relationships: []
      }
      heads: {
        Row: {
          created_at: number
          d: string
          event_id: string
          kind: number
          pubkey: string
        }
        Insert: {
          created_at: number
          d?: string
          event_id: string
          kind: number
          pubkey: string
        }
        Update: {
          created_at?: number
          d?: string
          event_id?: string
          kind?: number
          pubkey?: string
        }
        Relationships: [
          {
            foreignKeyName: "heads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      opened_threads: {
        Row: {
          first_opened_at: string | null
          last_opened_at: string | null
          root_event_id: string
          who: string
        }
        Insert: {
          first_opened_at?: string | null
          last_opened_at?: string | null
          root_event_id: string
          who: string
        }
        Update: {
          first_opened_at?: string | null
          last_opened_at?: string | null
          root_event_id?: string
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "opened_threads_root_event_id_fkey"
            columns: ["root_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pubkey_relays: {
        Row: {
          can_read: boolean | null
          can_write: boolean | null
          pubkey: string
          relay: string
          updated_at: string | null
        }
        Insert: {
          can_read?: boolean | null
          can_write?: boolean | null
          pubkey: string
          relay: string
          updated_at?: string | null
        }
        Update: {
          can_read?: boolean | null
          can_write?: boolean | null
          pubkey?: string
          relay?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      relay_cursors: {
        Row: {
          last_ok_at: string | null
          relay: string
          since_created_at: number
          stream: string
          who: string
        }
        Insert: {
          last_ok_at?: string | null
          relay: string
          since_created_at?: number
          stream: string
          who: string
        }
        Update: {
          last_ok_at?: string | null
          relay?: string
          since_created_at?: number
          stream?: string
          who?: string
        }
        Relationships: []
      }
      relay_health: {
        Row: {
          fail_streak: number | null
          last_ok_at: string | null
          latency_ms: number | null
          relay: string
          score: number
        }
        Insert: {
          fail_streak?: number | null
          last_ok_at?: string | null
          latency_ms?: number | null
          relay: string
          score?: number
        }
        Update: {
          fail_streak?: number | null
          last_ok_at?: string | null
          latency_ms?: number | null
          relay?: string
          score?: number
        }
        Relationships: []
      }
      saved_notes: {
        Row: {
          event_id: string
          saved_at: string | null
          who: string
        }
        Insert: {
          event_id: string
          saved_at?: string | null
          who: string
        }
        Update: {
          event_id?: string
          saved_at?: string | null
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_cursor: {
        Args: {
          p_relay: string
          p_since: number
          p_stream: string
          p_who: string
        }
        Returns: undefined
      }
      ingest_event: {
        Args: {
          ev: Json
          p_keep?: Database["public"]["Enums"]["retention_class"]
          p_relay?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      retention_class: "permanent" | "window" | "scoped" | "drop"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      retention_class: ["permanent", "window", "scoped", "drop"],
    },
  },
} as const
