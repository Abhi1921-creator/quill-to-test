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
      answer_keys: {
        Row: {
          answers: Json
          created_at: string
          exam_id: string
          id: string
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          exam_id: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          answers?: Json
          created_at?: string
          exam_id?: string
          id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sections: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          exam_id: string
          id: string
          marks_per_question: number | null
          name: string
          negative_marks_per_question: number | null
          order_index: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          exam_id: string
          id?: string
          marks_per_question?: number | null
          name: string
          negative_marks_per_question?: number | null
          order_index?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          exam_id?: string
          id?: string
          marks_per_question?: number | null
          name?: string
          negative_marks_per_question?: number | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          created_at: string
          current_question_index: number | null
          current_section_index: number | null
          end_time: string | null
          exam_id: string
          id: string
          ip_address: string | null
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          student_id: string
          time_remaining_seconds: number | null
          user_agent: string | null
          violation_logs: Json | null
          violations_count: number | null
        }
        Insert: {
          created_at?: string
          current_question_index?: number | null
          current_section_index?: number | null
          end_time?: string | null
          exam_id: string
          id?: string
          ip_address?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id: string
          time_remaining_seconds?: number | null
          user_agent?: string | null
          violation_logs?: Json | null
          violations_count?: number | null
        }
        Update: {
          created_at?: string
          current_question_index?: number | null
          current_section_index?: number | null
          end_time?: string | null
          exam_id?: string
          id?: string
          ip_address?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          student_id?: string
          time_remaining_seconds?: number | null
          user_agent?: string | null
          violation_logs?: Json | null
          violations_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          ends_at: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          institute_id: string | null
          instructions: string | null
          max_attempts: number | null
          negative_marking: boolean | null
          negative_marks_per_question: number | null
          passing_marks: number | null
          show_result_immediately: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          starts_at: string | null
          status: Database["public"]["Enums"]["exam_status"]
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          institute_id?: string | null
          instructions?: string | null
          max_attempts?: number | null
          negative_marking?: boolean | null
          negative_marks_per_question?: number | null
          passing_marks?: number | null
          show_result_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          title: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          institute_id?: string | null
          instructions?: string | null
          max_attempts?: number | null
          negative_marking?: boolean | null
          negative_marks_per_question?: number | null
          passing_marks?: number | null
          show_result_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name?: string
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
          institute_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          institute_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          institute_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          difficulty: string | null
          exam_id: string
          explanation: string | null
          id: string
          image_url: string | null
          marks: number | null
          negative_marks: number | null
          options: Json
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          section_id: string | null
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          difficulty?: string | null
          exam_id: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json
          order_index?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          difficulty?: string | null
          exam_id?: string
          explanation?: string | null
          id?: string
          image_url?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          is_marked_for_review: boolean | null
          is_visited: boolean | null
          question_id: string
          selected_answer: Json | null
          session_id: string
          time_spent_seconds: number | null
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_marked_for_review?: boolean | null
          is_visited?: boolean | null
          question_id: string
          selected_answer?: Json | null
          session_id: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_marked_for_review?: boolean | null
          is_visited?: boolean | null
          question_id?: string
          selected_answer?: Json | null
          session_id?: string
          time_spent_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_for_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          accuracy: number | null
          attempted: number
          correct: number
          created_at: string
          evaluated_at: string | null
          exam_id: string
          id: string
          is_published: boolean | null
          marks_obtained: number
          percentage: number | null
          percentile: number | null
          rank: number | null
          section_wise_scores: Json | null
          session_id: string
          skipped: number
          student_id: string
          time_taken_seconds: number | null
          total_marks: number
          total_questions: number
          wrong: number
        }
        Insert: {
          accuracy?: number | null
          attempted?: number
          correct?: number
          created_at?: string
          evaluated_at?: string | null
          exam_id: string
          id?: string
          is_published?: boolean | null
          marks_obtained?: number
          percentage?: number | null
          percentile?: number | null
          rank?: number | null
          section_wise_scores?: Json | null
          session_id: string
          skipped?: number
          student_id: string
          time_taken_seconds?: number | null
          total_marks?: number
          total_questions?: number
          wrong?: number
        }
        Update: {
          accuracy?: number | null
          attempted?: number
          correct?: number
          created_at?: string
          evaluated_at?: string | null
          exam_id?: string
          id?: string
          is_published?: boolean | null
          marks_obtained?: number
          percentage?: number | null
          percentile?: number | null
          rank?: number | null
          section_wise_scores?: Json | null
          session_id?: string
          skipped?: number
          student_id?: string
          time_taken_seconds?: number | null
          total_marks?: number
          total_questions?: number
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          institute_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institute_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institute_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      questions_for_students: {
        Row: {
          correct_answer: Json | null
          created_at: string | null
          difficulty: string | null
          exam_id: string | null
          explanation: string | null
          id: string | null
          image_url: string | null
          marks: number | null
          negative_marks: number | null
          options: Json | null
          order_index: number | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          section_id: string | null
        }
        Insert: {
          correct_answer?: never
          created_at?: string | null
          difficulty?: string | null
          exam_id?: string | null
          explanation?: never
          id?: string | null
          image_url?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          order_index?: number | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          section_id?: string | null
        }
        Update: {
          correct_answer?: never
          created_at?: string | null
          difficulty?: string | null
          exam_id?: string | null
          explanation?: never
          id?: string | null
          image_url?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          order_index?: number | null
          question_text?: string | null
          question_type?: Database["public"]["Enums"]["question_type"] | null
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_institute: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _institute_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "institute_admin" | "teacher" | "student"
      exam_status: "draft" | "published" | "archived"
      exam_type:
        | "ssc"
        | "banking"
        | "engineering"
        | "medical"
        | "upsc"
        | "custom"
      question_type:
        | "single_correct"
        | "multiple_correct"
        | "true_false"
        | "numeric"
      session_status:
        | "in_progress"
        | "submitted"
        | "auto_submitted"
        | "terminated"
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
      app_role: ["super_admin", "institute_admin", "teacher", "student"],
      exam_status: ["draft", "published", "archived"],
      exam_type: ["ssc", "banking", "engineering", "medical", "upsc", "custom"],
      question_type: [
        "single_correct",
        "multiple_correct",
        "true_false",
        "numeric",
      ],
      session_status: [
        "in_progress",
        "submitted",
        "auto_submitted",
        "terminated",
      ],
    },
  },
} as const
