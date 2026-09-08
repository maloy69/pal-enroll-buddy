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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      criteria: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          max_value: number
          name: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          max_value?: number
          name: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          max_value?: number
          name?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          note: string | null
          registration_id: string
          status: Database["public"]["Enums"]["doc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          note?: string | null
          registration_id: string
          status?: Database["public"]["Enums"]["doc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          note?: string | null
          registration_id?: string
          status?: Database["public"]["Enums"]["doc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      majors: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          quota: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          quota?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          quota?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registration_scores: {
        Row: {
          created_at: string
          criteria_id: string
          id: string
          registration_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          criteria_id: string
          id?: string
          registration_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          criteria_id?: string
          id?: string
          registration_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "registration_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          accepted_major_id: string | null
          address: string | null
          birth_date: string | null
          birth_place: string | null
          city: string | null
          created_at: string
          district: string | null
          enrolled_at: string | null
          first_choice_id: string | null
          full_name: string | null
          gender: string | null
          graduation_year: string | null
          id: string
          nik: string | null
          nisn: string | null
          parent_email: string | null
          parent_job: string | null
          parent_name: string | null
          parent_phone: string | null
          postal_code: string | null
          previous_school: string | null
          province: string | null
          qr_token: string
          rank: number | null
          registration_number: string | null
          second_choice_id: string | null
          status: Database["public"]["Enums"]["reg_status"]
          submitted_at: string | null
          total_score: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verify_note: string | null
          village: string | null
        }
        Insert: {
          accepted_major_id?: string | null
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          enrolled_at?: string | null
          first_choice_id?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: string | null
          id?: string
          nik?: string | null
          nisn?: string | null
          parent_email?: string | null
          parent_job?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          postal_code?: string | null
          previous_school?: string | null
          province?: string | null
          qr_token?: string
          rank?: number | null
          registration_number?: string | null
          second_choice_id?: string | null
          status?: Database["public"]["Enums"]["reg_status"]
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verify_note?: string | null
          village?: string | null
        }
        Update: {
          accepted_major_id?: string | null
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          enrolled_at?: string | null
          first_choice_id?: string | null
          full_name?: string | null
          gender?: string | null
          graduation_year?: string | null
          id?: string
          nik?: string | null
          nisn?: string | null
          parent_email?: string | null
          parent_job?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          postal_code?: string | null
          previous_school?: string | null
          province?: string | null
          qr_token?: string
          rank?: number | null
          registration_number?: string | null
          second_choice_id?: string | null
          status?: Database["public"]["Enums"]["reg_status"]
          submitted_at?: string | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verify_note?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_accepted_major_id_fkey"
            columns: ["accepted_major_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_first_choice_id_fkey"
            columns: ["first_choice_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_second_choice_id_fkey"
            columns: ["second_choice_id"]
            isOneToOne: false
            referencedRelation: "majors"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          academic_year: string
          address: string | null
          announcement_at: string | null
          announcement_published: boolean
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: boolean
          registration_close_at: string | null
          registration_open_at: string | null
          reregistration_close_at: string | null
          school_name: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          address?: string | null
          announcement_at?: string | null
          announcement_published?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: boolean
          registration_close_at?: string | null
          registration_open_at?: string | null
          reregistration_close_at?: string | null
          school_name?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          address?: string | null
          announcement_at?: string | null
          announcement_published?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: boolean
          registration_close_at?: string | null
          registration_open_at?: string | null
          reregistration_close_at?: string | null
          school_name?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      public_results: {
        Row: {
          major_code: string | null
          major_name: string | null
          masked_name: string | null
          rank: number | null
          registration_number: string | null
          status: Database["public"]["Enums"]["reg_status"] | null
          total_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_first_operator: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      run_selection: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "operator" | "wali"
      doc_status: "pending" | "approved" | "rejected"
      reg_status:
        | "draft"
        | "submitted"
        | "verified"
        | "rejected"
        | "accepted"
        | "not_accepted"
        | "enrolled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "operator", "wali"],
      doc_status: ["pending", "approved", "rejected"],
      reg_status: [
        "draft",
        "submitted",
        "verified",
        "rejected",
        "accepted",
        "not_accepted",
        "enrolled",
      ],
    },
  },
} as const
