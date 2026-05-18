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
      academic_terms: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          ends_on: string
          id: string
          is_active: boolean
          name: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          ends_on: string
          id?: string
          is_active?: boolean
          name: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          ends_on?: string
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_approval_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          expires_at: string
          id: string
          payload: Json | null
          reason: string | null
          request_type: Database["public"]["Enums"]["approval_request_type"]
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          subject_id: string
          subject_table: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          request_type: Database["public"]["Enums"]["approval_request_type"]
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject_id: string
          subject_table: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json | null
          reason?: string | null
          request_type?: Database["public"]["Enums"]["approval_request_type"]
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          subject_id?: string
          subject_table?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_approval_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      age_groups: {
        Row: {
          code: string
          created_at: string
          id: string
          max_age: number
          min_age: number
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          max_age: number
          min_age: number
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          max_age?: number
          min_age?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          branch_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_holidays: {
        Row: {
          branch_id: string
          created_at: string
          holiday_date: string
          id: string
          is_recurring: boolean
          name: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          holiday_date: string
          id?: string
          is_recurring?: boolean
          name: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          holiday_date?: string
          id?: string
          is_recurring?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          key: string
          operation: string
          request_hash: string | null
          response: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          key: string
          operation: string
          request_hash?: string | null
          response?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          key?: string
          operation?: string
          request_hash?: string | null
          response?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          channels: Database["public"]["Enums"]["notification_channel"][]
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          branch_id: string | null
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          expires_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          branch_id?: string | null
          category: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          branch_id?: string | null
          category?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_archive: {
        Row: {
          body: string | null
          branch_id: string | null
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          expires_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          branch_id?: string | null
          category: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          branch_id?: string | null
          category?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          expires_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      policy_snapshots: {
        Row: {
          id: string
          policy_keys: string[]
          scope_id: string
          scope_table: string
          snapshot: Json
          snapshotted_at: string
        }
        Insert: {
          id?: string
          policy_keys: string[]
          scope_id: string
          scope_table: string
          snapshot: Json
          snapshotted_at?: string
        }
        Update: {
          id?: string
          policy_keys?: string[]
          scope_id?: string
          scope_table?: string
          snapshot?: Json
          snapshotted_at?: string
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
          is_active: boolean
          phone: string | null
          preferred_lang: Database["public"]["Enums"]["preferred_language"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          preferred_lang?: Database["public"]["Enums"]["preferred_language"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          preferred_lang?: Database["public"]["Enums"]["preferred_language"]
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          archived_at: string | null
          branch_id: string
          capacity: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_online: boolean
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          branch_id: string
          capacity?: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          branch_id?: string
          capacity?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_policies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_branch_ids: { Args: never; Returns: string[] }
      get_policy: { Args: { _key: string }; Returns: Json }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: Database["public"]["Enums"]["audit_action"]
          _after?: Json
          _before?: Json
          _branch_id?: string
          _metadata?: Json
          _resource_id: string
          _resource_type: string
        }
        Returns: string
      }
      user_has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "branch_admin"
        | "reception"
        | "trainer"
        | "sales"
        | "moderator"
        | "parent"
        | "student"
      approval_request_type:
        | "absence_excuse"
        | "restricted_recovery"
        | "retake_exam"
        | "refund"
        | "transfer_branch"
        | "transfer_group"
        | "reinstatement"
        | "lead_reactivation"
        | "other"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "cancelled"
      attendance_status: "present" | "absent" | "late" | "excused"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "role_change"
        | "policy_change"
        | "approval"
        | "export"
        | "other"
      call_recording_status:
        | "recording"
        | "uploading"
        | "complete"
        | "failed"
        | "deleted"
      commission_status:
        | "pending_payment"
        | "pending_activation"
        | "locked_for_payout"
        | "paid"
        | "clawed_back"
        | "cancelled"
      content_type:
        | "slides"
        | "summary_video"
        | "full_video"
        | "homework"
        | "quiz"
        | "final_exam"
        | "other"
      failure_reason_type: "academy_fault" | "student_fault" | "pending_review"
      installment_status: "pending" | "paid" | "overdue" | "waived"
      lead_status:
        | "new"
        | "assigned"
        | "contacted"
        | "qualified"
        | "negotiation"
        | "won"
        | "lost"
        | "unreachable"
        | "archived"
        | "converted"
      notification_channel: "in_app" | "email" | "sms" | "push" | "whatsapp"
      notification_status: "pending" | "sent" | "failed" | "read" | "archived"
      package_tier: "squad" | "core" | "x"
      payment_status: "pending" | "paid" | "partial" | "refunded" | "cancelled"
      preferred_language: "ar" | "en"
      session_status:
        | "scheduled"
        | "open"
        | "closed"
        | "cancelled"
        | "needs_admin_review"
      subscription_status:
        | "pending_payment"
        | "active_waiting"
        | "active"
        | "paused"
        | "frozen"
        | "restricted"
        | "expired"
        | "cancelled"
      treasury_account_type: "cash" | "wallet" | "bank"
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
      app_role: [
        "super_admin",
        "branch_admin",
        "reception",
        "trainer",
        "sales",
        "moderator",
        "parent",
        "student",
      ],
      approval_request_type: [
        "absence_excuse",
        "restricted_recovery",
        "retake_exam",
        "refund",
        "transfer_branch",
        "transfer_group",
        "reinstatement",
        "lead_reactivation",
        "other",
      ],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "cancelled",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      audit_action: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "role_change",
        "policy_change",
        "approval",
        "export",
        "other",
      ],
      call_recording_status: [
        "recording",
        "uploading",
        "complete",
        "failed",
        "deleted",
      ],
      commission_status: [
        "pending_payment",
        "pending_activation",
        "locked_for_payout",
        "paid",
        "clawed_back",
        "cancelled",
      ],
      content_type: [
        "slides",
        "summary_video",
        "full_video",
        "homework",
        "quiz",
        "final_exam",
        "other",
      ],
      failure_reason_type: ["academy_fault", "student_fault", "pending_review"],
      installment_status: ["pending", "paid", "overdue", "waived"],
      lead_status: [
        "new",
        "assigned",
        "contacted",
        "qualified",
        "negotiation",
        "won",
        "lost",
        "unreachable",
        "archived",
        "converted",
      ],
      notification_channel: ["in_app", "email", "sms", "push", "whatsapp"],
      notification_status: ["pending", "sent", "failed", "read", "archived"],
      package_tier: ["squad", "core", "x"],
      payment_status: ["pending", "paid", "partial", "refunded", "cancelled"],
      preferred_language: ["ar", "en"],
      session_status: [
        "scheduled",
        "open",
        "closed",
        "cancelled",
        "needs_admin_review",
      ],
      subscription_status: [
        "pending_payment",
        "active_waiting",
        "active",
        "paused",
        "frozen",
        "restricted",
        "expired",
        "cancelled",
      ],
      treasury_account_type: ["cash", "wallet", "bank"],
    },
  },
} as const
