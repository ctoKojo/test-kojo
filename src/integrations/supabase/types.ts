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
      entry_test_attempts: {
        Row: {
          answers: Json
          branch_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          confirmed_level_id: string | null
          created_at: string
          id: string
          recommended_level_id: string | null
          score_pct: number | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          branch_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_level_id?: string | null
          created_at?: string
          id?: string
          recommended_level_id?: string | null
          score_pct?: number | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          branch_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          confirmed_level_id?: string | null
          created_at?: string
          id?: string
          recommended_level_id?: string | null
          score_pct?: number | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_test_attempts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_test_attempts_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_test_attempts_confirmed_level_id_fkey"
            columns: ["confirmed_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_test_attempts_recommended_level_id_fkey"
            columns: ["recommended_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      group_enrollments: {
        Row: {
          completed_at: string | null
          drop_reason: string | null
          dropped_at: string | null
          enrolled_at: string
          group_id: string
          id: string
          package_id: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          drop_reason?: string | null
          dropped_at?: string | null
          enrolled_at?: string
          group_id: string
          id?: string
          package_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          completed_at?: string | null
          drop_reason?: string | null
          dropped_at?: string | null
          enrolled_at?: string
          group_id?: string
          id?: string
          package_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      group_sessions: {
        Row: {
          branch_id: string
          close_reason: string | null
          closed_by: string | null
          created_at: string
          group_id: string
          id: string
          room_id: string | null
          scheduled_at_utc: string
          scheduled_end_at_utc: string
          session_number: number
          status: Database["public"]["Enums"]["session_status"]
          trainer_id: string
          updated_at: string
          version: number
        }
        Insert: {
          branch_id: string
          close_reason?: string | null
          closed_by?: string | null
          created_at?: string
          group_id: string
          id?: string
          room_id?: string | null
          scheduled_at_utc: string
          scheduled_end_at_utc: string
          session_number: number
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          branch_id?: string
          close_reason?: string | null
          closed_by?: string | null
          created_at?: string
          group_id?: string
          id?: string
          room_id?: string | null
          scheduled_at_utc?: string
          scheduled_end_at_utc?: string
          session_number?: number
          status?: Database["public"]["Enums"]["session_status"]
          trainer_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          branch_id: string
          created_at: string
          deleted_at: string | null
          id: string
          level_id: string
          max_students: number
          name: string
          online_link: string | null
          package_tier: Database["public"]["Enums"]["package_tier"]
          room_id: string | null
          schedule_meta: Json
          starts_on: string | null
          status: string
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          term_id: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level_id: string
          max_students?: number
          name: string
          online_link?: string | null
          package_tier: Database["public"]["Enums"]["package_tier"]
          room_id?: string | null
          schedule_meta?: Json
          starts_on?: string | null
          status?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          term_id?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level_id?: string
          max_students?: number
          name?: string
          online_link?: string | null
          package_tier?: Database["public"]["Enums"]["package_tier"]
          room_id?: string | null
          schedule_meta?: Json
          starts_on?: string | null
          status?: string
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          term_id?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      level_determination_rules: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          level_id: string
          min_score_pct: number
          priority: number
          question_tag: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          level_id: string
          min_score_pct: number
          priority?: number
          question_tag: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          level_id?: string
          min_score_pct?: number
          priority?: number
          question_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_determination_rules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_determination_rules_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      level_prerequisites: {
        Row: {
          id: string
          level_id: string
          requires_level: string
        }
        Insert: {
          id?: string
          level_id: string
          requires_level: string
        }
        Update: {
          id?: string
          level_id?: string
          requires_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_prerequisites_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_prerequisites_requires_level_fkey"
            columns: ["requires_level"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          branch_id: string
          classwork_weight: number
          created_at: string
          deleted_at: string | null
          description: string | null
          exam_weight: number
          id: string
          name: string
          order_index: number
          passing_score: number
          sessions_count: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          classwork_weight?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exam_weight?: number
          id?: string
          name: string
          order_index: number
          passing_score?: number
          sessions_count?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          classwork_weight?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exam_weight?: number
          id?: string
          name?: string
          order_index?: number
          passing_score?: number
          sessions_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "levels_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      package_content_access: {
        Row: {
          allowed: boolean
          content_type: Database["public"]["Enums"]["content_type"]
          id: string
          tier: Database["public"]["Enums"]["package_tier"]
        }
        Insert: {
          allowed?: boolean
          content_type: Database["public"]["Enums"]["content_type"]
          id?: string
          tier: Database["public"]["Enums"]["package_tier"]
        }
        Update: {
          allowed?: boolean
          content_type?: Database["public"]["Enums"]["content_type"]
          id?: string
          tier?: Database["public"]["Enums"]["package_tier"]
        }
        Relationships: []
      }
      packages: {
        Row: {
          branch_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          max_students: number
          name: string
          price: number
          sessions_count: number
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          max_students: number
          name: string
          price: number
          sessions_count?: number
          tier: Database["public"]["Enums"]["package_tier"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          max_students?: number
          name?: string
          price?: number
          sessions_count?: number
          tier?: Database["public"]["Enums"]["package_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          branch_id: string
          created_at: string
          deleted_at: string | null
          id: string
          profile_id: string
          relation_type: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          profile_id: string
          relation_type?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          profile_id?: string
          relation_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_snapshots: {
        Row: {
          branch_id: string | null
          enrollment_id: string | null
          id: string
          policy_keys: string[]
          scope_id: string
          scope_table: string
          snapshot: Json
          snapshotted_at: string
        }
        Insert: {
          branch_id?: string | null
          enrollment_id?: string | null
          id?: string
          policy_keys: string[]
          scope_id: string
          scope_table: string
          snapshot: Json
          snapshotted_at?: string
        }
        Update: {
          branch_id?: string | null
          enrollment_id?: string | null
          id?: string
          policy_keys?: string[]
          scope_id?: string
          scope_table?: string
          snapshot?: Json
          snapshotted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_policy_snapshots_enrollment"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "group_enrollments"
            referencedColumns: ["id"]
          },
        ]
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
      session_attendance: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          locked_at: string | null
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          locked_at?: string | null
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          locked_at?: string | null
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "group_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age_group_id: string | null
          birthdate: string | null
          branch_id: string
          created_at: string
          current_group_id: string | null
          current_level_id: string | null
          deleted_at: string | null
          gender: string | null
          id: string
          notes: string | null
          profile_id: string
          school: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          age_group_id?: string | null
          birthdate?: string | null
          branch_id: string
          created_at?: string
          current_group_id?: string | null
          current_level_id?: string | null
          deleted_at?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          school?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          age_group_id?: string | null
          birthdate?: string | null
          branch_id?: string
          created_at?: string
          current_group_id?: string | null
          current_level_id?: string | null
          deleted_at?: string | null
          gender?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          school?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_current_group"
            columns: ["current_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "age_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      waiting_list: {
        Row: {
          assigned_at: string | null
          branch_id: string
          id: string
          joined_at: string
          level_id: string | null
          notes: string | null
          package_tier: Database["public"]["Enums"]["package_tier"] | null
          position: number | null
          student_id: string
        }
        Insert: {
          assigned_at?: string | null
          branch_id: string
          id?: string
          joined_at?: string
          level_id?: string | null
          notes?: string | null
          package_tier?: Database["public"]["Enums"]["package_tier"] | null
          position?: number | null
          student_id: string
        }
        Update: {
          assigned_at?: string | null
          branch_id?: string
          id?: string
          joined_at?: string
          level_id?: string | null
          notes?: string | null
          package_tier?: Database["public"]["Enums"]["package_tier"] | null
          position?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_accessible_content: {
        Row: {
          allowed: boolean | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          group_id: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
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
      enrollment_status:
        | "active"
        | "completed"
        | "dropped"
        | "transferred"
        | "frozen"
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
      subscription_type: "offline" | "online" | "hybrid"
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
      enrollment_status: [
        "active",
        "completed",
        "dropped",
        "transferred",
        "frozen",
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
      subscription_type: ["offline", "online", "hybrid"],
      treasury_account_type: ["cash", "wallet", "bank"],
    },
  },
} as const
