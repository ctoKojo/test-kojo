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
      absence_excuses: {
        Row: {
          attachment_url: string | null
          attendance_record_id: string | null
          created_at: string
          id: string
          reason: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: string
          student_id: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          attendance_record_id?: string | null
          created_at?: string
          id?: string
          reason: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: string
          student_id: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          attendance_record_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: string
          student_id?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_excuses_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_excuses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_excuses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_excuses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_excuses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          session_id: string
          source_session_id: string | null
          status: string
          student_id: string
          submission_url: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          session_id: string
          source_session_id?: string | null
          status?: string
          student_id: string
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          session_id?: string
          source_session_id?: string | null
          status?: string
          student_id?: string
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          group_id: string
          id: string
          is_compensation: boolean
          max_score: number
          session_id: string
          source_session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          group_id: string
          id?: string
          is_compensation?: boolean
          max_score?: number
          session_id: string
          source_session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          group_id?: string
          id?: string
          is_compensation?: boolean
          max_score?: number
          session_id?: string
          source_session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          branch_id: string
          created_at: string
          group_id: string
          id: string
          is_locked: boolean
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          session_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          group_id: string
          id?: string
          is_locked?: boolean
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          group_id?: string
          id?: string
          is_locked?: boolean
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      branch_kpis: {
        Row: {
          academic_term_id: string
          academy_fault_failures: number
          active_students: number
          avg_attendance_pct: number
          branch_id: string
          cancelled_sessions: number
          completed_sessions: number
          computed_at: string
          created_at: string
          dropped_students: number
          id: string
          month: number
          net_revenue: number | null
          new_enrollments: number
          overdue_installments: number
          promotions_count: number
          restricted_students: number
          retentions_count: number
          total_expenses: number
          total_refunds: number
          total_revenue: number
          total_sessions: number
          total_students: number
          updated_at: string
          year: number
        }
        Insert: {
          academic_term_id: string
          academy_fault_failures?: number
          active_students?: number
          avg_attendance_pct?: number
          branch_id: string
          cancelled_sessions?: number
          completed_sessions?: number
          computed_at?: string
          created_at?: string
          dropped_students?: number
          id?: string
          month: number
          net_revenue?: number | null
          new_enrollments?: number
          overdue_installments?: number
          promotions_count?: number
          restricted_students?: number
          retentions_count?: number
          total_expenses?: number
          total_refunds?: number
          total_revenue?: number
          total_sessions?: number
          total_students?: number
          updated_at?: string
          year: number
        }
        Update: {
          academic_term_id?: string
          academy_fault_failures?: number
          active_students?: number
          avg_attendance_pct?: number
          branch_id?: string
          cancelled_sessions?: number
          completed_sessions?: number
          computed_at?: string
          created_at?: string
          dropped_students?: number
          id?: string
          month?: number
          net_revenue?: number | null
          new_enrollments?: number
          overdue_installments?: number
          promotions_count?: number
          restricted_students?: number
          retentions_count?: number
          total_expenses?: number
          total_refunds?: number
          total_revenue?: number
          total_sessions?: number
          total_students?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_kpis_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_kpis_branch_id_fkey"
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
      certificates: {
        Row: {
          academic_term_id: string | null
          branch_id: string
          certificate_type: string
          certificate_url: string | null
          created_at: string
          group_id: string | null
          id: string
          issued_at: string
          issued_by: string | null
          metadata: Json | null
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          academic_term_id?: string | null
          branch_id: string
          certificate_type: string
          certificate_url?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json | null
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          academic_term_id?: string | null
          branch_id?: string
          certificate_type?: string
          certificate_url?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          metadata?: Json | null
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_sessions: {
        Row: {
          branch_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          group_id: string
          id: string
          is_within_working_hours: boolean
          original_session_id: string
          room_id: string | null
          scheduled_at: string
          status: string
          student_id: string
          trainer_extra_pay: number
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          group_id: string
          id?: string
          is_within_working_hours?: boolean
          original_session_id: string
          room_id?: string | null
          scheduled_at: string
          status?: string
          student_id: string
          trainer_extra_pay?: number
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          group_id?: string
          id?: string
          is_within_working_hours?: boolean
          original_session_id?: string
          room_id?: string | null
          scheduled_at?: string
          status?: string
          student_id?: string
          trainer_extra_pay?: number
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_original_session_id_fkey"
            columns: ["original_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consecutive_absence_tracker: {
        Row: {
          consecutive_absences: number
          consecutive_missed_hw: number
          group_id: string
          id: string
          last_updated: string
          student_id: string
        }
        Insert: {
          consecutive_absences?: number
          consecutive_missed_hw?: number
          group_id: string
          id?: string
          last_updated?: string
          student_id: string
        }
        Update: {
          consecutive_absences?: number
          consecutive_missed_hw?: number
          group_id?: string
          id?: string
          last_updated?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consecutive_absence_tracker_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consecutive_absence_tracker_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      expenses: {
        Row: {
          amount: number
          branch_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          idempotency_key: string
          receipt_url: string | null
          treasury_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          idempotency_key: string
          receipt_url?: string | null
          treasury_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          idempotency_key?: string
          receipt_url?: string | null
          treasury_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_treasury_id_fkey"
            columns: ["treasury_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          branch_id: string
          created_at: string
          deleted_at: string | null
          discount_pct: number
          id: string
          installments_count: number
          is_active: boolean
          name: string
          package_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          deleted_at?: string | null
          discount_pct?: number
          id?: string
          installments_count?: number
          is_active?: boolean
          name: string
          package_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          deleted_at?: string | null
          discount_pct?: number
          id?: string
          installments_count?: number
          is_active?: boolean
          name?: string
          package_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          branch_id: string
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          is_anonymous: boolean
          score: number | null
          session_id: string | null
          student_id: string | null
          submitted_at: string
          trainer_id: string | null
        }
        Insert: {
          branch_id: string
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          is_anonymous?: boolean
          score?: number | null
          session_id?: string | null
          student_id?: string | null
          submitted_at?: string
          trainer_id?: string | null
        }
        Update: {
          branch_id?: string
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_anonymous?: boolean
          score?: number | null
          session_id?: string | null
          student_id?: string | null
          submitted_at?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      final_exam_results: {
        Row: {
          created_at: string
          exam_id: string
          failure_reason_type: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          notes: string | null
          passed: boolean | null
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          failure_reason_type?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          failure_reason_type?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "final_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_exam_results_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      final_exams: {
        Row: {
          academic_term_id: string
          created_at: string
          created_by: string | null
          exam_date: string
          group_id: string
          id: string
          max_score: number
          passing_score: number
          title: string
          updated_at: string
        }
        Insert: {
          academic_term_id: string
          created_at?: string
          created_by?: string | null
          exam_date: string
          group_id: string
          id?: string
          max_score?: number
          passing_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          academic_term_id?: string
          created_at?: string
          created_by?: string | null
          exam_date?: string
          group_id?: string
          id?: string
          max_score?: number
          passing_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "final_exams_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_exams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
      installments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_id: string
          payment_method: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["installment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id: string
          payment_method?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string
          payment_method?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["installment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          full_price: number | null
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
          full_price?: number | null
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
          full_price?: number | null
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
      payments: {
        Row: {
          amount_paid: number
          amount_total: number
          branch_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          fee_plan_id: string | null
          id: string
          idempotency_key: string
          notes: string | null
          payment_method: string
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          amount_total: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          fee_plan_id?: string | null
          id?: string
          idempotency_key: string
          notes?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          amount_total?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          fee_plan_id?: string | null
          id?: string
          idempotency_key?: string
          notes?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_reassignment_queue: {
        Row: {
          assigned_to: string | null
          branch_id: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          session_id: string
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_reassignment_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_reassignment_queue_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_reassignment_queue_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_reassignment_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
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
      quiz_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          session_id: string
          source_session_id: string | null
          started_at: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          session_id: string
          source_session_id?: string | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          session_id?: string
          source_session_id?: string | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string
          duration_minutes: number
          group_id: string
          id: string
          is_compensation: boolean
          is_published: boolean
          max_score: number
          passing_score: number
          session_id: string
          source_session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline: string
          duration_minutes?: number
          group_id: string
          id?: string
          is_compensation?: boolean
          is_published?: boolean
          max_score?: number
          passing_score?: number
          session_id: string
          source_session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string
          duration_minutes?: number
          group_id?: string
          id?: string
          is_compensation?: boolean
          is_published?: boolean
          max_score?: number
          passing_score?: number
          session_id?: string
          source_session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          payment_id: string
          policy_applied: Json | null
          processed_at: string | null
          reason: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          payment_id: string
          policy_applied?: Json | null
          processed_at?: string | null
          reason: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          payment_id?: string
          policy_applied?: Json | null
          processed_at?: string | null
          reason?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      session_content: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          published_at: string | null
          session_id: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          session_id: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          session_id?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_content_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_evaluations: {
        Row: {
          attendance_score: number | null
          created_at: string
          evaluated_by: string | null
          homework_score: number | null
          id: string
          notes: string | null
          overall_score: number | null
          participation_score: number | null
          session_id: string
          source_session_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_score?: number | null
          created_at?: string
          evaluated_by?: string | null
          homework_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          participation_score?: number | null
          session_id: string
          source_session_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_score?: number | null
          created_at?: string
          evaluated_by?: string | null
          homework_score?: number | null
          id?: string
          notes?: string | null
          overall_score?: number | null
          participation_score?: number | null
          session_id?: string
          source_session_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_evaluations_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      siblings_discounts: {
        Row: {
          applied_at: string
          discount_amount: number
          discount_pct: number
          id: string
          installment_id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          applied_at?: string
          discount_amount: number
          discount_pct: number
          id?: string
          installment_id: string
          parent_id: string
          student_id: string
        }
        Update: {
          applied_at?: string
          discount_amount?: number
          discount_pct?: number
          id?: string
          installment_id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "siblings_discounts_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siblings_discounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siblings_discounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_kpis: {
        Row: {
          academic_term_id: string
          assignments_missed: number
          assignments_submitted: number
          attendance_pct: number
          avg_assignment_score: number | null
          avg_quiz_score: number | null
          compensation_sessions_taken: number
          computed_at: string
          created_at: string
          id: string
          month: number
          quizzes_failed: number
          quizzes_passed: number
          sessions_absent: number
          sessions_attended: number
          sessions_excused: number
          student_id: string
          updated_at: string
          warnings_issued: number
          year: number
        }
        Insert: {
          academic_term_id: string
          assignments_missed?: number
          assignments_submitted?: number
          attendance_pct?: number
          avg_assignment_score?: number | null
          avg_quiz_score?: number | null
          compensation_sessions_taken?: number
          computed_at?: string
          created_at?: string
          id?: string
          month: number
          quizzes_failed?: number
          quizzes_passed?: number
          sessions_absent?: number
          sessions_attended?: number
          sessions_excused?: number
          student_id: string
          updated_at?: string
          warnings_issued?: number
          year: number
        }
        Update: {
          academic_term_id?: string
          assignments_missed?: number
          assignments_submitted?: number
          attendance_pct?: number
          avg_assignment_score?: number | null
          avg_quiz_score?: number | null
          compensation_sessions_taken?: number
          computed_at?: string
          created_at?: string
          id?: string
          month?: number
          quizzes_failed?: number
          quizzes_passed?: number
          sessions_absent?: number
          sessions_attended?: number
          sessions_excused?: number
          student_id?: string
          updated_at?: string
          warnings_issued?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_kpis_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_kpis_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progression_log: {
        Row: {
          academic_term_id: string
          created_at: string
          decided_at: string
          decided_by: string | null
          failure_reason_type: string | null
          from_level_id: string | null
          id: string
          notes: string | null
          progression_type: string
          student_id: string
          to_level_id: string | null
        }
        Insert: {
          academic_term_id: string
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          failure_reason_type?: string | null
          from_level_id?: string | null
          id?: string
          notes?: string | null
          progression_type: string
          student_id: string
          to_level_id?: string | null
        }
        Update: {
          academic_term_id?: string
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          failure_reason_type?: string | null
          from_level_id?: string | null
          id?: string
          notes?: string | null
          progression_type?: string
          student_id?: string
          to_level_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progression_log_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progression_log_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progression_log_from_level_id_fkey"
            columns: ["from_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progression_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progression_log_to_level_id_fkey"
            columns: ["to_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      student_restriction_log: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          lift_reason: string | null
          lifted_at: string | null
          lifted_by: string | null
          notes: string | null
          requires_admin_approval: boolean
          restricted_at: string
          restriction_type: string
          student_id: string
          trigger_value: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          notes?: string | null
          requires_admin_approval?: boolean
          restricted_at?: string
          restriction_type: string
          student_id: string
          trigger_value?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          lift_reason?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          notes?: string | null
          requires_admin_approval?: boolean
          restricted_at?: string
          restriction_type?: string
          student_id?: string
          trigger_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_restriction_log_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_restriction_log_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_restriction_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transfers: {
        Row: {
          branch_id: string
          created_at: string
          financial_notes: string | null
          from_branch_id: string | null
          from_group_id: string | null
          id: string
          idempotency_key: string
          sessions_carried: number
          student_id: string
          to_branch_id: string | null
          to_group_id: string | null
          transfer_type: Database["public"]["Enums"]["transfer_type"]
          transferred_by: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          financial_notes?: string | null
          from_branch_id?: string | null
          from_group_id?: string | null
          id?: string
          idempotency_key: string
          sessions_carried?: number
          student_id: string
          to_branch_id?: string | null
          to_group_id?: string | null
          transfer_type: Database["public"]["Enums"]["transfer_type"]
          transferred_by?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          financial_notes?: string | null
          from_branch_id?: string | null
          from_group_id?: string | null
          id?: string
          idempotency_key?: string
          sessions_carried?: number
          student_id?: string
          to_branch_id?: string | null
          to_group_id?: string | null
          transfer_type?: Database["public"]["Enums"]["transfer_type"]
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_transfers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_from_group_id_fkey"
            columns: ["from_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_to_group_id_fkey"
            columns: ["to_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_warnings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          branch_id: string
          created_at: string
          description: string | null
          id: string
          issued_at: string
          issued_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          student_id: string
          title: string
          updated_at: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          branch_id: string
          created_at?: string
          description?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          student_id: string
          title: string
          updated_at?: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          branch_id?: string
          created_at?: string
          description?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          student_id?: string
          title?: string
          updated_at?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_warnings_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_warnings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_warnings_student_id_fkey"
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
      subscriptions: {
        Row: {
          branch_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string | null
          enrollment_id: string
          id: string
          package_id: string
          pause_reason: string | null
          paused_at: string | null
          remaining_sessions: number
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          student_id: string
          subscription_end_date: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at?: string | null
          enrollment_id: string
          id?: string
          package_id: string
          pause_reason?: string | null
          paused_at?: string | null
          remaining_sessions?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id: string
          subscription_end_date?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at?: string | null
          enrollment_id?: string
          id?: string
          package_id?: string
          pause_reason?: string | null
          paused_at?: string | null
          remaining_sessions?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id?: string
          subscription_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "group_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_log: {
        Row: {
          branch_id: string | null
          check_type: string
          checked_at: string
          details: Json | null
          id: string
          status: string
        }
        Insert: {
          branch_id?: string | null
          check_type: string
          checked_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Update: {
          branch_id?: string | null
          check_type?: string
          checked_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_health_log_branch_id_fkey"
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
      trainer_kpis: {
        Row: {
          academic_term_id: string
          assignments_graded: number
          avg_attendance_pct: number
          avg_student_score: number | null
          branch_id: string
          cancelled_sessions: number
          compensation_sessions: number
          completed_sessions: number
          computed_at: string
          created_at: string
          id: string
          month: number
          quizzes_graded: number
          student_satisfaction_score: number | null
          total_sessions: number
          trainer_id: string
          updated_at: string
          year: number
        }
        Insert: {
          academic_term_id: string
          assignments_graded?: number
          avg_attendance_pct?: number
          avg_student_score?: number | null
          branch_id: string
          cancelled_sessions?: number
          compensation_sessions?: number
          completed_sessions?: number
          computed_at?: string
          created_at?: string
          id?: string
          month: number
          quizzes_graded?: number
          student_satisfaction_score?: number | null
          total_sessions?: number
          trainer_id: string
          updated_at?: string
          year: number
        }
        Update: {
          academic_term_id?: string
          assignments_graded?: number
          avg_attendance_pct?: number
          avg_student_score?: number | null
          branch_id?: string
          cancelled_sessions?: number
          compensation_sessions?: number
          completed_sessions?: number
          computed_at?: string
          created_at?: string
          id?: string
          month?: number
          quizzes_graded?: number
          student_satisfaction_score?: number | null
          total_sessions?: number
          trainer_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "trainer_kpis_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_kpis_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_kpis_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_accounts: {
        Row: {
          account_type: string
          balance: number
          branch_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_type: string
          balance?: number
          branch_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          balance?: number
          branch_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_movements: {
        Row: {
          amount: number
          balance_after: number
          branch_id: string
          created_at: string
          description: string | null
          direction: string
          id: string
          idempotency_key: string
          movement_type: Database["public"]["Enums"]["treasury_movement_type"]
          performed_by: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          treasury_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          branch_id: string
          created_at?: string
          description?: string | null
          direction: string
          id?: string
          idempotency_key: string
          movement_type: Database["public"]["Enums"]["treasury_movement_type"]
          performed_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          treasury_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          branch_id?: string
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          idempotency_key?: string
          movement_type?: Database["public"]["Enums"]["treasury_movement_type"]
          performed_by?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          treasury_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_treasury_id_fkey"
            columns: ["treasury_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      fn_create_payment_with_installments: {
        Args: {
          p_amount_total: number
          p_fee_plan_id: string
          p_idempotency_key: string
          p_installments: Json
          p_notes?: string
          p_payment_method: string
          p_student_id: string
          p_subscription_id: string
        }
        Returns: string
      }
      fn_recalculate_sibling_discounts: {
        Args: { p_parent_id: string }
        Returns: undefined
      }
      fn_record_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_description: string
          p_expense_date: string
          p_idempotency_key: string
          p_treasury_id: string
        }
        Returns: string
      }
      fn_record_income: {
        Args: {
          p_amount: number
          p_description: string
          p_idempotency_key: string
          p_related_entity_id: string
          p_related_entity_type: string
          p_treasury_id: string
        }
        Returns: string
      }
      fn_transfer_between_accounts: {
        Args: {
          p_amount: number
          p_description: string
          p_from_treasury_id: string
          p_idempotency_key: string
          p_to_treasury_id: string
        }
        Returns: undefined
      }
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
      rpc_approve_excuse: {
        Args: {
          p_approved: boolean
          p_excuse_id: string
          p_idempotency_key?: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
      rpc_compute_branch_kpis: {
        Args: {
          p_academic_term_id: string
          p_branch_id: string
          p_idempotency_key?: string
          p_month: number
          p_year: number
        }
        Returns: Json
      }
      rpc_compute_student_kpis: {
        Args: {
          p_academic_term_id: string
          p_idempotency_key?: string
          p_month: number
          p_student_id: string
          p_year: number
        }
        Returns: Json
      }
      rpc_grade_assignment: {
        Args: {
          p_feedback?: string
          p_idempotency_key?: string
          p_score: number
          p_submission_id: string
        }
        Returns: Json
      }
      rpc_issue_certificate: {
        Args: {
          p_academic_term_id?: string
          p_certificate_type: string
          p_certificate_url?: string
          p_group_id?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_student_id: string
          p_title: string
        }
        Returns: Json
      }
      rpc_issue_warning: {
        Args: {
          p_description?: string
          p_idempotency_key?: string
          p_severity: string
          p_student_id: string
          p_title: string
          p_warning_type: string
        }
        Returns: Json
      }
      rpc_lift_restriction: {
        Args: {
          p_idempotency_key?: string
          p_lift_reason: string
          p_student_id: string
        }
        Returns: Json
      }
      rpc_mark_attendance: {
        Args: {
          p_idempotency_key?: string
          p_notes?: string
          p_session_id: string
          p_status: string
          p_student_id: string
        }
        Returns: Json
      }
      rpc_record_progression: {
        Args: {
          p_academic_term_id: string
          p_failure_reason_type?: string
          p_from_level_id?: string
          p_idempotency_key?: string
          p_notes?: string
          p_progression_type: string
          p_student_id: string
          p_to_level_id?: string
        }
        Returns: Json
      }
      rpc_schedule_compensation: {
        Args: {
          p_duration_minutes?: number
          p_idempotency_key?: string
          p_is_within_working_hours?: boolean
          p_original_session_id: string
          p_room_id?: string
          p_scheduled_at: string
          p_student_id: string
          p_trainer_extra_pay?: number
          p_trainer_id?: string
        }
        Returns: Json
      }
      rpc_submit_assignment: {
        Args: {
          p_assignment_id: string
          p_idempotency_key?: string
          p_student_id: string
          p_submission_url?: string
        }
        Returns: Json
      }
      rpc_submit_excuse: {
        Args: {
          p_attachment_url?: string
          p_idempotency_key?: string
          p_reason: string
          p_session_id: string
          p_student_id: string
        }
        Returns: Json
      }
      rpc_submit_quiz_attempt: {
        Args: {
          p_answers: Json
          p_idempotency_key?: string
          p_quiz_id: string
          p_score: number
          p_student_id: string
        }
        Returns: Json
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
        | "waiting"
      failure_reason_type: "academy_fault" | "student_fault" | "pending_review"
      installment_status:
        | "pending"
        | "paid"
        | "overdue"
        | "waived"
        | "cancelled"
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
      payment_status:
        | "pending"
        | "paid"
        | "partial"
        | "refunded"
        | "cancelled"
        | "active"
        | "partially_refunded"
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
      transfer_type: "group_change" | "branch_change" | "level_change"
      treasury_account_type: "cash" | "wallet" | "bank"
      treasury_movement_type:
        | "income"
        | "expense"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "refund"
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
        "waiting",
      ],
      failure_reason_type: ["academy_fault", "student_fault", "pending_review"],
      installment_status: ["pending", "paid", "overdue", "waived", "cancelled"],
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
      payment_status: [
        "pending",
        "paid",
        "partial",
        "refunded",
        "cancelled",
        "active",
        "partially_refunded",
      ],
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
      transfer_type: ["group_change", "branch_change", "level_change"],
      treasury_account_type: ["cash", "wallet", "bank"],
      treasury_movement_type: [
        "income",
        "expense",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "refund",
      ],
    },
  },
} as const
