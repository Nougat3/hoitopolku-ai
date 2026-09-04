/**
 * Live Supabase schema types (hoitopolku-ai).
 * Compatible with @supabase/supabase-js Database generic.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'potilas' | 'laakari' | 'yllapito';

export type MetricKey =
  | 'weight'
  | 'waist'
  | 'ldl'
  | 'hba1c'
  | 'glucose'
  | 'sodium'
  | 'potassium'
  | 'creatinine';

export type LinkedMetric = 'bp' | 'ldl' | 'hba1c' | 'weight' | 'glucose';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          idp_sub: string | null;
          created_at: string;
          updated_at: string;
          auth_user_id: string | null;
          full_name: string | null;
          title: string | null;
        };
        Insert: {
          id: string;
          email: string;
          role: AppRole;
          idp_sub?: string | null;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          full_name?: string | null;
          title?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          role?: AppRole;
          idp_sub?: string | null;
          created_at?: string;
          updated_at?: string;
          auth_user_id?: string | null;
          full_name?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      bp_measurements: {
        Row: {
          id: string;
          patient_id: string;
          sys: number;
          dia: number;
          pulse: number | null;
          time_of_day: string | null;
          measured_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          sys: number;
          dia: number;
          pulse?: number | null;
          time_of_day?: string | null;
          measured_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          sys?: number;
          dia?: number;
          pulse?: number | null;
          time_of_day?: string | null;
          measured_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bp_measurements_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      metric_measurements: {
        Row: {
          id: string;
          patient_id: string;
          metric: string;
          value: number;
          measured_at: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          metric: string;
          value: number;
          measured_at?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          metric?: string;
          value?: number;
          measured_at?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'metric_measurements_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      patient_medications: {
        Row: {
          id: string;
          patient_id: string;
          name: string;
          dose: string;
          started_on: string;
          ended_on: string | null;
          linked_metric: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          name: string;
          dose: string;
          started_on: string;
          ended_on?: string | null;
          linked_metric?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          name?: string;
          dose?: string;
          started_on?: string;
          ended_on?: string | null;
          linked_metric?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_medications_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      patient_targets: {
        Row: {
          patient_id: string;
          bp_sys: number;
          bp_dia: number;
          ldl: number;
          hba1c: number;
          weight: number | null;
          weight_note: string | null;
          updated_at: string;
          glucose: number | null;
        };
        Insert: {
          patient_id: string;
          bp_sys?: number;
          bp_dia?: number;
          ldl?: number;
          hba1c?: number;
          weight?: number | null;
          weight_note?: string | null;
          updated_at?: string;
          glucose?: number | null;
        };
        Update: {
          patient_id?: string;
          bp_sys?: number;
          bp_dia?: number;
          ldl?: number;
          hba1c?: number;
          weight?: number | null;
          weight_note?: string | null;
          updated_at?: string;
          glucose?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_targets_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      patient_tasks: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          detail: string | null;
          due_hint: string | null;
          target_view: string | null;
          sort_order: number;
          done: boolean;
          done_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          detail?: string | null;
          due_hint?: string | null;
          target_view?: string | null;
          sort_order?: number;
          done?: boolean;
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          detail?: string | null;
          due_hint?: string | null;
          target_view?: string | null;
          sort_order?: number;
          done?: boolean;
          done_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_tasks_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      symptom_reports: {
        Row: {
          id: string;
          patient_id: string;
          symptoms: string[];
          severity: number | null;
          note: string | null;
          reported_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          symptoms: string[];
          severity?: number | null;
          note?: string | null;
          reported_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          symptoms?: string[];
          severity?: number | null;
          note?: string | null;
          reported_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'symptom_reports_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      care_events: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          detail: string | null;
          when_label: string;
          status: string;
          card_note: string | null;
          card_button: string | null;
          sort_order: number;
          occurs_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          detail?: string | null;
          when_label: string;
          status?: string;
          card_note?: string | null;
          card_button?: string | null;
          sort_order?: number;
          occurs_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          title?: string;
          detail?: string | null;
          when_label?: string;
          status?: string;
          card_note?: string | null;
          card_button?: string | null;
          sort_order?: number;
          occurs_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'care_events_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      care_sessions: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          access_code_id: string | null;
          expires_at: string;
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          access_code_id?: string | null;
          expires_at: string;
          created_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          access_code_id?: string | null;
          expires_at?: string;
          created_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'care_sessions_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      patient_access_codes: {
        Row: {
          id: string;
          patient_id: string;
          code_hash: string;
          expires_at: string;
          created_at: string;
          revoked_at: string | null;
          redeemed_at: string | null;
          redeemed_by_doctor_id: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          code_hash: string;
          expires_at: string;
          created_at?: string;
          revoked_at?: string | null;
          redeemed_at?: string | null;
          redeemed_by_doctor_id?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          code_hash?: string;
          expires_at?: string;
          created_at?: string;
          revoked_at?: string | null;
          redeemed_at?: string | null;
          redeemed_by_doctor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_access_codes_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      enrollments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          status: string;
          pregnancy_excluded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          patient_id: string;
          doctor_id: string;
          status: string;
          pregnancy_excluded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          status?: string;
          pregnancy_excluded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          entity: string;
          entity_id: string;
          at: string;
          meta: string | null;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          entity: string;
          entity_id: string;
          at?: string;
          meta?: string | null;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          entity?: string;
          entity_id?: string;
          at?: string;
          meta?: string | null;
        };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          price_id: string | null;
          plan: string;
          status: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          price_id?: string | null;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          price_id?: string | null;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_patient_access_code: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      revoke_patient_access_code: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      redeem_patient_access_code: {
        Args: { p_code: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type AppUser = Database['public']['Tables']['users']['Row'];
export type BpMeasurement = Database['public']['Tables']['bp_measurements']['Row'];
export type MetricMeasurement = Database['public']['Tables']['metric_measurements']['Row'];
export type PatientMedication = Database['public']['Tables']['patient_medications']['Row'];
export type PatientTargets = Database['public']['Tables']['patient_targets']['Row'];
export type PatientTask = Database['public']['Tables']['patient_tasks']['Row'];
export type SymptomReport = Database['public']['Tables']['symptom_reports']['Row'];
export type CareEvent = Database['public']['Tables']['care_events']['Row'];
export type CareSession = Database['public']['Tables']['care_sessions']['Row'];
