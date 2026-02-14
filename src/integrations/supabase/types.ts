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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          days_remaining: number
          display_name: string | null
          expires_at: string
          id: string
          is_active: boolean
          notes: string | null
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          days_remaining?: number
          display_name?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          days_remaining?: number
          display_name?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          logo: string | null
          name: string
          sort_order: number
          stream: string | null
          stream_url_2: string | null
          stream_url_3: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          logo?: string | null
          name: string
          sort_order?: number
          stream?: string | null
          stream_url_2?: string | null
          stream_url_3?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          logo?: string | null
          name?: string
          sort_order?: number
          stream?: string | null
          stream_url_2?: string | null
          stream_url_3?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          espn_id: string | null
          event_date: string
          id: string
          is_active: boolean
          is_live: boolean
          league: string | null
          name: string
          pending_url: string | null
          pending_url_2: string | null
          pending_url_3: string | null
          sport: string | null
          stream_url: string | null
          stream_url_2: string | null
          stream_url_3: string | null
          team_away: string | null
          team_home: string | null
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          espn_id?: string | null
          event_date: string
          id?: string
          is_active?: boolean
          is_live?: boolean
          league?: string | null
          name: string
          pending_url?: string | null
          pending_url_2?: string | null
          pending_url_3?: string | null
          sport?: string | null
          stream_url?: string | null
          stream_url_2?: string | null
          stream_url_3?: string | null
          team_away?: string | null
          team_home?: string | null
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          espn_id?: string | null
          event_date?: string
          id?: string
          is_active?: boolean
          is_live?: boolean
          league?: string | null
          name?: string
          pending_url?: string | null
          pending_url_2?: string | null
          pending_url_3?: string | null
          sport?: string | null
          stream_url?: string | null
          stream_url_2?: string | null
          stream_url_3?: string | null
          team_away?: string | null
          team_home?: string | null
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_scraped_links: {
        Row: {
          category: string | null
          created_at: string
          id: string
          match_id: string
          match_title: string
          scanned_at: string
          source_admin: string | null
          source_delta: string | null
          source_echo: string | null
          source_golf: string | null
          team_away: string | null
          team_home: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          match_id: string
          match_title: string
          scanned_at?: string
          source_admin?: string | null
          source_delta?: string | null
          source_echo?: string | null
          source_golf?: string | null
          team_away?: string | null
          team_home?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          match_id?: string
          match_title?: string
          scanned_at?: string
          source_admin?: string | null
          source_delta?: string | null
          source_echo?: string | null
          source_golf?: string | null
          team_away?: string | null
          team_home?: string | null
        }
        Relationships: []
      }
      media_links: {
        Row: {
          created_at: string
          episode: number | null
          id: string
          is_active: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          platform: string | null
          poster_path: string | null
          season: number | null
          stream_url: string
          title: string
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode?: number | null
          id?: string
          is_active?: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          platform?: string | null
          poster_path?: string | null
          season?: number | null
          stream_url: string
          title: string
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode?: number | null
          id?: string
          is_active?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          platform?: string | null
          poster_path?: string | null
          season?: number | null
          stream_url?: string
          title?: string
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      partidos_en_vivo: {
        Row: {
          esta_activo: boolean | null
          fecha_actualizacion: string | null
          id: string
          match_name: string | null
          sources: Json | null
        }
        Insert: {
          esta_activo?: boolean | null
          fecha_actualizacion?: string | null
          id?: string
          match_name?: string | null
          sources?: Json | null
        }
        Update: {
          esta_activo?: boolean | null
          fecha_actualizacion?: string | null
          id?: string
          match_name?: string | null
          sources?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      media_type: "movie" | "series" | "dorama"
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
      app_role: ["admin", "user"],
      media_type: ["movie", "series", "dorama"],
    },
  },
} as const
