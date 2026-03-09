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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          competitor_id: string | null
          created_at: string
          id: string
          input_json: Json
          kind: Database["public"]["Enums"]["generation_kind"]
          listing_audit_id: string | null
          model_name: string | null
          output_json: Json
          owner: string
          project_id: string | null
          prompt_version: string | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          competitor_id?: string | null
          created_at?: string
          id?: string
          input_json?: Json
          kind: Database["public"]["Enums"]["generation_kind"]
          listing_audit_id?: string | null
          model_name?: string | null
          output_json?: Json
          owner: string
          project_id?: string | null
          prompt_version?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          competitor_id?: string | null
          created_at?: string
          id?: string
          input_json?: Json
          kind?: Database["public"]["Enums"]["generation_kind"]
          listing_audit_id?: string | null
          model_name?: string | null
          output_json?: Json
          owner?: string
          project_id?: string | null
          prompt_version?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: []
      }
      competitors: {
        Row: {
          asin: string
          comparison_json: Json
          created_at: string
          currency_code: string | null
          description: string | null
          id: string
          listing_audit_id: string | null
          marketplace: string
          owner: string
          price_amount: number | null
          project_id: string
          rating: number | null
          raw_json: Json
          review_count: number | null
          title: string | null
          updated_at: string
          bullet_points: Json
        }
        Insert: {
          asin: string
          comparison_json?: Json
          created_at?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          listing_audit_id?: string | null
          marketplace?: string
          owner: string
          price_amount?: number | null
          project_id: string
          rating?: number | null
          raw_json?: Json
          review_count?: number | null
          title?: string | null
          updated_at?: string
          bullet_points?: Json
        }
        Update: {
          asin?: string
          comparison_json?: Json
          created_at?: string
          currency_code?: string | null
          description?: string | null
          id?: string
          listing_audit_id?: string | null
          marketplace?: string
          owner?: string
          price_amount?: number | null
          project_id?: string
          rating?: number | null
          raw_json?: Json
          review_count?: number | null
          title?: string | null
          updated_at?: string
          bullet_points?: Json
        }
        Relationships: []
      }
      listing_audits: {
        Row: {
          analyzed_at: string | null
          asin: string | null
          backend_keywords: string | null
          brand_name: string | null
          bullet_points: Json
          category_name: string | null
          compliance_score: number | null
          conversion_score: number | null
          created_at: string
          currency_code: string | null
          id: string
          image_count: number | null
          input_json: Json
          issues_json: Json
          listing_url: string | null
          locale: string
          marketplace: string
          normalized_json: Json
          overall_score: number | null
          owner: string
          price_amount: number | null
          product_description: string | null
          product_title: string | null
          project_id: string | null
          rating: number | null
          readability_score: number | null
          recommendations_json: Json
          result_json: Json
          review_count: number | null
          score_json: Json
          seo_score: number | null
          status: Database["public"]["Enums"]["audit_status"]
          updated_at: string
        }
        Insert: {
          analyzed_at?: string | null
          asin?: string | null
          backend_keywords?: string | null
          brand_name?: string | null
          bullet_points?: Json
          category_name?: string | null
          compliance_score?: number | null
          conversion_score?: number | null
          created_at?: string
          currency_code?: string | null
          id?: string
          image_count?: number | null
          input_json?: Json
          issues_json?: Json
          listing_url?: string | null
          locale?: string
          marketplace?: string
          normalized_json?: Json
          overall_score?: number | null
          owner: string
          price_amount?: number | null
          product_description?: string | null
          product_title?: string | null
          project_id?: string | null
          rating?: number | null
          readability_score?: number | null
          recommendations_json?: Json
          result_json?: Json
          review_count?: number | null
          score_json?: Json
          seo_score?: number | null
          status?: Database["public"]["Enums"]["audit_status"]
          updated_at?: string
        }
        Update: {
          analyzed_at?: string | null
          asin?: string | null
          backend_keywords?: string | null
          brand_name?: string | null
          bullet_points?: Json
          category_name?: string | null
          compliance_score?: number | null
          conversion_score?: number | null
          created_at?: string
          currency_code?: string | null
          id?: string
          image_count?: number | null
          input_json?: Json
          issues_json?: Json
          listing_url?: string | null
          locale?: string
          marketplace?: string
          normalized_json?: Json
          overall_score?: number | null
          owner?: string
          price_amount?: number | null
          product_description?: string | null
          product_title?: string | null
          project_id?: string | null
          rating?: number | null
          readability_score?: number | null
          recommendations_json?: Json
          result_json?: Json
          review_count?: number | null
          score_json?: Json
          seo_score?: number | null
          status?: Database["public"]["Enums"]["audit_status"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          brand_name: string | null
          created_at: string
          default_language: string
          id: string
          marketplace: string
          name: string
          owner: string
          primary_category: string | null
          product_type: string | null
          target_customer: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          default_language?: string
          id?: string
          marketplace?: string
          name: string
          owner: string
          primary_category?: string | null
          product_type?: string | null
          target_customer?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          default_language?: string
          id?: string
          marketplace?: string
          name?: string
          owner?: string
          primary_category?: string | null
          product_type?: string | null
          target_customer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          created_at: string
          description: string | null
          done: boolean
          done_at: string | null
          id: number
          owner: string
          title: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner: string
          title: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          done?: boolean
          done_at?: string | null
          id?: number
          owner?: string
          title?: string
          urgent?: boolean
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          ai_credits_monthly: number
          ai_used: number
          audit_credits_monthly: number
          audits_used: number
          competitor_credits_monthly: number
          competitors_used: number
          created_at: string
          period_end: string
          period_start: string
          plan: Database["public"]["Enums"]["plan_code"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_credits_monthly?: number
          ai_used?: number
          audit_credits_monthly?: number
          audits_used?: number
          competitor_credits_monthly?: number
          competitors_used?: number
          created_at?: string
          period_end?: string
          period_start?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_credits_monthly?: number
          ai_used?: number
          audit_credits_monthly?: number
          audits_used?: number
          competitor_credits_monthly?: number
          competitors_used?: number
          created_at?: string
          period_end?: string
          period_start?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_status: "draft" | "queued" | "processing" | "completed" | "failed"
      generation_kind:
        | "audit_summary"
        | "title_rewrite"
        | "bullets_rewrite"
        | "description_rewrite"
        | "backend_keywords"
        | "competitor_summary"
      plan_code: "free" | "starter" | "pro" | "agency"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audit_status: ["draft", "queued", "processing", "completed", "failed"],
      generation_kind: [
        "audit_summary",
        "title_rewrite",
        "bullets_rewrite",
        "description_rewrite",
        "backend_keywords",
        "competitor_summary",
      ],
      plan_code: ["free", "starter", "pro", "agency"],
    },
  },
} as const
