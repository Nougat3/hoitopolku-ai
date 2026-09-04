/**
 * TypeScript type definitions for Supabase database
 * Generated from schema - keep in sync with migrations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'patient' | 'doctor' | 'admin';
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          gender: 'male' | 'female' | 'other' | null;
          care_path_start_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      doctors: {
        Row: {
          id: string;
          user_id: string;
          medical_title: string | null;
          specialization: string | null;
          license_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['doctors']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['doctors']['Insert']>;
      };
      care_paths: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          condition: string;
          status: 'active' | 'completed' | 'paused';
          target_systolic: number | null;
          target_diastolic: number | null;
          target_glucose: number | null;
          target_weight: number | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['care_paths']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['care_paths']['Insert']>;
      };
      measurements: {
        Row: {
          id: string;
          care_path_id: string;
          measurement_type: 'blood_pressure' | 'glucose' | 'weight';
          systolic: number | null;
          diastolic: number | null;
          glucose: number | null;
          weight: number | null;
          time_of_day: 'morning' | 'evening' | 'night' | null;
          measured_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['measurements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['measurements']['Insert']>;
      };
      lab_results: {
        Row: {
          id: string;
          care_path_id: string;
          test_name: string;
          value: number;
          unit: string;
          reference_min: number | null;
          reference_max: number | null;
          test_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lab_results']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['lab_results']['Insert']>;
      };
      medications: {
        Row: {
          id: string;
          care_path_id: string;
          name: string;
          dosage: string;
          morning: boolean;
          evening: boolean;
          is_active: boolean;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['medications']['Insert']>;
      };
      symptoms: {
        Row: {
          id: string;
          care_path_id: string;
          symptom_name: string;
          severity: number; // 0-5
          recorded_date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['symptoms']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['symptoms']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          care_path_id: string;
          event_type: 'medication_start' | 'medication_change' | 'lab_test' | 'appointment' | 'milestone';
          title: string;
          description: string | null;
          event_date: string;
          event_time: string | null;
          status: 'scheduled' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      access_log: {
        Row: {
          id: string;
          patient_id: string;
          accessed_by: string;
          access_type: 'view' | 'edit' | 'share';
          ip_address: string | null;
          user_agent: string | null;
          accessed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['access_log']['Row'], 'id' | 'accessed_at'>;
        Update: never; // Access log is append-only
      };
    };
  };
}
