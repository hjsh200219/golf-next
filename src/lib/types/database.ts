export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      golf_clubs: {
        Row: {
          id: string;
          name: string;
          display_name: string | null;
          url: string;
          origin: string | null;
          referer_login: string | null;
          referer_reservation: string | null;
          login_path: string | null;
          reservation_path: string | null;
          address: string | null;
          lat: number | null;
          lon: number | null;
          scraper_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          display_name?: string | null;
          url: string;
          origin?: string | null;
          referer_login?: string | null;
          referer_reservation?: string | null;
          login_path?: string | null;
          reservation_path?: string | null;
          address?: string | null;
          lat?: number | null;
          lon?: number | null;
          scraper_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['golf_clubs']['Insert']>;
        Relationships: [];
      };
      golf_club_courses: {
        Row: {
          id: number;
          club_id: string;
          course_name: string;
          course_code: string | null;
          lat: number | null;
          lon: number | null;
          address: string | null;
          is_active: boolean;
          cc_name: string | null;
          display_name: string | null;
          region: string | null;
          is_partner: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          club_id: string;
          course_name: string;
          course_code?: string | null;
          lat?: number | null;
          lon?: number | null;
          address?: string | null;
          is_active?: boolean;
          cc_name?: string | null;
          display_name?: string | null;
          region?: string | null;
          is_partner?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['golf_club_courses']['Insert']>;
        Relationships: [];
      };
      tee_times: {
        Row: {
          id: number;
          club_id: string;
          cc_name: string;
          date: string;
          teeoff: string;
          course: string | null;
          price: number | null;
          event: string | null;
          scraped_at: string;
        };
        Insert: {
          id?: number;
          club_id: string;
          cc_name: string;
          date: string;
          teeoff: string;
          course?: string | null;
          price?: number | null;
          event?: string | null;
          scraped_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tee_times']['Insert']>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          phone?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
        Relationships: [];
      };
      user_favorites: {
        Row: {
          id: number;
          user_id: string;
          club_id: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          club_id: string;
        };
        Update: Partial<Database['public']['Tables']['user_favorites']['Insert']>;
        Relationships: [];
      };
      device_favorites: {
        Row: {
          id: number;
          device_id: string;
          club_id: string;
          created_at: string;
          last_accessed_at: string;
        };
        Insert: {
          id?: number;
          device_id: string;
          club_id: string;
          last_accessed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['device_favorites']['Insert']>;
        Relationships: [];
      };
      scrape_jobs: {
        Row: {
          id: number;
          date: string;
          status: string;
          total_clubs: number;
          completed_clubs: number;
          failed_clubs: string[] | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          date: string;
          status?: string;
          total_clubs?: number;
          completed_clubs?: number;
          failed_clubs?: string[] | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['scrape_jobs']['Insert']>;
        Relationships: [];
      };
      scrape_club_results: {
        Row: {
          id: number;
          job_id: number;
          club_id: string;
          status: string;
          error_message: string | null;
          tee_time_count: number;
          duration_ms: number | null;
          scraped_at: string | null;
        };
        Insert: {
          id?: number;
          job_id: number;
          club_id: string;
          status?: string;
          error_message?: string | null;
          tee_time_count?: number;
          duration_ms?: number | null;
        };
        Update: Partial<Database['public']['Tables']['scrape_club_results']['Insert']>;
        Relationships: [];
      };
      weather_cache: {
        Row: {
          id: number;
          geohash: string;
          lat: number;
          lon: number;
          data_type: string;
          data: Json;
          cached_at: string;
          expires_at: string;
        };
        Insert: {
          id?: number;
          geohash: string;
          lat: number;
          lon: number;
          data_type: string;
          data: Json;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['weather_cache']['Insert']>;
        Relationships: [];
      };
      telegram_watches: {
        Row: {
          id: number;
          chat_id: number;
          club_id: string;
          date: string;
          time_from: string;
          time_to: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          chat_id: number;
          club_id: string;
          date: string;
          time_from: string;
          time_to: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['telegram_watches']['Insert']>;
        Relationships: [];
      };
      yangju_reservation_watches: {
        Row: {
          id: number;
          chat_id: number;
          date: string;
          time_from: string;
          time_to: string;
          course: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          chat_id: number;
          date: string;
          time_from: string;
          time_to: string;
          course?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['yangju_reservation_watches']['Insert']>;
        Relationships: [];
      };
      yangju_reservation_attempts: {
        Row: {
          id: number;
          chat_id: number;
          date: string;
          tee_time: string;
          course: string;
          resolved_pointid: string | null;
          status: string;
          idempotency_key: string;
          payload_log: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          chat_id: number;
          date: string;
          tee_time: string;
          course: string;
          resolved_pointid?: string | null;
          status?: string;
          idempotency_key: string;
          payload_log?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['yangju_reservation_attempts']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
