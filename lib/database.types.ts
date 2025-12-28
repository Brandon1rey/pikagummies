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
    PostgrestVersion: "13.0.5"
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
      batch_ingredients: {
        Row: {
          id: string
          organization_id: string
          production_batch_id: string | null
          qty_used: number
          raw_material_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          production_batch_id?: string | null
          qty_used: number
          raw_material_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          production_batch_id?: string | null
          qty_used?: number
          raw_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_ingredients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_ingredients_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_conversations: {
        Row: {
          created_at: string | null
          customer_phone: string
          id: string
          intent_detected: string | null
          message_body: string
          organization_id: string
          sender: string
        }
        Insert: {
          created_at?: string | null
          customer_phone: string
          id?: string
          intent_detected?: string | null
          message_body: string
          organization_id: string
          sender: string
        }
        Update: {
          created_at?: string | null
          customer_phone?: string
          id?: string
          intent_detected?: string | null
          message_body?: string
          organization_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customers: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          organization_id: string
          phone: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id: string
          phone: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          phone?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string | null
          description: string | null
          id: string
          organization_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_products: {
        Row: {
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          name: string
          organization_id: string
          package_weight: number | null
          sale_price: number
          unit: string | null
          weight_unit: string | null
        }
        Insert: {
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          organization_id: string
          package_weight?: number | null
          sale_price: number
          unit?: string | null
          weight_unit?: string | null
        }
        Update: {
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          organization_id?: string
          package_weight?: number | null
          sale_price?: number
          unit?: string | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["invite_role"] | null
          role_to_assign: Database["public"]["Enums"]["invite_role"] | null
          status: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["invite_role"] | null
          role_to_assign?: Database["public"]["Enums"]["invite_role"] | null
          status?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["invite_role"] | null
          role_to_assign?: Database["public"]["Enums"]["invite_role"] | null
          status?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invites_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invites_used_by"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_channels: {
        Row: {
          api_key_ref: string | null
          created_at: string | null
          organization_id: string
          phone_number_id: string
          platform: string
        }
        Insert: {
          api_key_ref?: string | null
          created_at?: string | null
          organization_id: string
          phone_number_id: string
          platform?: string
        }
        Update: {
          api_key_ref?: string | null
          created_at?: string | null
          organization_id?: string
          phone_number_id?: string
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          business_description: string | null
          logo_url: string | null
          module_inventory: boolean | null
          module_production: boolean | null
          module_recipes: boolean | null
          module_team: boolean | null
          organization_id: string
          terminology: Json | null
          theme_accent: string | null
          theme_background: string | null
          theme_foreground: string | null
          theme_mode: string | null
          theme_preset: string | null
          theme_primary_color: string | null
          theme_radius: string | null
        }
        Insert: {
          business_description?: string | null
          logo_url?: string | null
          module_inventory?: boolean | null
          module_production?: boolean | null
          module_recipes?: boolean | null
          module_team?: boolean | null
          organization_id: string
          terminology?: Json | null
          theme_accent?: string | null
          theme_background?: string | null
          theme_foreground?: string | null
          theme_mode?: string | null
          theme_preset?: string | null
          theme_primary_color?: string | null
          theme_radius?: string | null
        }
        Update: {
          business_description?: string | null
          logo_url?: string | null
          module_inventory?: boolean | null
          module_production?: boolean | null
          module_recipes?: boolean | null
          module_team?: boolean | null
          organization_id?: string
          terminology?: Json | null
          theme_accent?: string | null
          theme_background?: string | null
          theme_foreground?: string | null
          theme_mode?: string | null
          theme_preset?: string | null
          theme_primary_color?: string | null
          theme_radius?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      production_batches: {
        Row: {
          created_at: string | null
          created_by: string | null
          finished_product_id: string | null
          id: string
          organization_id: string
          quantity_produced: number
          total_batch_cost: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id: string
          quantity_produced: number
          total_batch_cost: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id?: string
          quantity_produced?: number
          total_batch_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          organization_id: string | null
          phone: string | null
          role: string | null
          tags: string[] | null
          telegram_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          telegram_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[] | null
          telegram_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          average_cost: number | null
          current_stock: number | null
          emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          package_weight: number | null
          unit: string
          weight_unit: string | null
        }
        Insert: {
          average_cost?: number | null
          current_stock?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          package_weight?: number | null
          unit: string
          weight_unit?: string | null
        }
        Update: {
          average_cost?: number | null
          current_stock?: number | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          package_weight?: number | null
          unit?: string
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          created_by: string | null
          finished_product_id: string | null
          id: string
          organization_id: string
          qty_required: number
          raw_material_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id: string
          qty_required: number
          raw_material_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id?: string
          qty_required?: number
          raw_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_phone: string | null
          finished_product_id: string | null
          id: string
          organization_id: string
          quantity: number
          shipping_address: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_phone?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id: string
          quantity: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_phone?: string | null
          finished_product_id?: string | null
          id?: string
          organization_id?: string
          quantity?: number
          shipping_address?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          organization_id: string
          type: Database["public"]["Enums"]["post_type"] | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          organization_id: string
          type?: Database["public"]["Enums"]["post_type"] | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          organization_id?: string
          type?: Database["public"]["Enums"]["post_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "team_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_id: string
          id: string
          payload: Json | null
          processed_at: string | null
        }
        Insert: {
          event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_financials: {
        Row: {
          amount: number | null
          month: string | null
          organization_id: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_user_delete: { Args: { p_organization_id: string }; Returns: boolean }
      check_user_org_access: { Args: { org_id: string }; Returns: boolean }
      create_product_with_recipe: {
        Args: {
          p_ingredients: Json
          p_name: string
          p_organization_id: string
          p_sale_price: number
        }
        Returns: Json
      }
      create_tenant:
        | {
            Args: {
              p_admin_email: string
              p_admin_uid: string
              p_name: string
              p_slug: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_email: string
              p_admin_uid: string
              p_is_crafting: boolean
              p_name: string
              p_slug: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_email: string
              p_admin_uid: string
              p_is_crafting: boolean
              p_name: string
              p_slug: string
              p_theme_color: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_email: string
              p_admin_uid: string
              p_is_crafting: boolean
              p_name: string
              p_slug: string
              p_terminology?: Json
              p_theme_color: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_admin_email: string
              p_admin_uid: string
              p_name: string
              p_slug: string
              p_theme_color?: string
              p_type?: string
            }
            Returns: Json
          }
      delete_finished_product: {
        Args: { p_organization_id: string; p_product_id: string }
        Returns: Json
      }
      delete_product_recipe: {
        Args: { p_organization_id: string; p_product_id: string }
        Returns: Json
      }
      delete_raw_material: {
        Args: { p_material_id: string; p_organization_id: string }
        Returns: Json
      }
      get_expense_breakdown:
        | {
            Args: never
            Returns: {
              category: string
              total_amount: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              category: string
              total_amount: number
            }[]
          }
      get_monthly_sales:
        | {
            Args: never
            Returns: {
              month_name: string
              total_revenue: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              month_name: string
              total_revenue: number
            }[]
          }
      get_product_performance: {
        Args: never
        Returns: {
          product_name: string
          sale_count: number
          total_revenue: number
        }[]
      }
      get_product_recipe:
        | {
            Args: { p_product_id: string }
            Returns: {
              material_cost: number
              material_name: string
              qty_required: number
              raw_material_id: string
              unit: string
            }[]
          }
        | {
            Args: { p_organization_id?: string; p_product_id: string }
            Returns: {
              material_cost: number
              material_name: string
              qty_required: number
              raw_material_id: string
              unit: string
            }[]
          }
      get_quarterly_sales:
        | {
            Args: never
            Returns: {
              quarter_name: string
              total_revenue: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              quarter_name: string
              total_revenue: number
            }[]
          }
      get_sales_by_dow:
        | {
            Args: never
            Returns: {
              day_name: string
              sale_count: number
              total_revenue: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              day_name: string
              sale_count: number
              total_revenue: number
            }[]
          }
      get_sales_by_hour:
        | {
            Args: never
            Returns: {
              hour_of_day: number
              sale_count: number
            }[]
          }
        | {
            Args: { end_date: string; start_date: string }
            Returns: {
              hour_of_day: number
              sale_count: number
            }[]
          }
      get_top_products: {
        Args: never
        Returns: {
          product_name: string
          sale_count: number
          total_revenue: number
        }[]
      }
      is_platform_admin: { Args: never; Returns: boolean }
      purchase_new_material:
        | {
            Args: {
              p_emoji: string
              p_name: string
              p_qty: number
              p_total_price: number
              p_unit: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_emoji: string
              p_name: string
              p_organization_id?: string
              p_qty: number
              p_total_price: number
              p_unit: string
              p_user_id: string
            }
            Returns: undefined
          }
      record_experimental_batch:
        | {
            Args: {
              p_ingredients: Json
              p_product_id: string
              p_qty_produced: number
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_ingredients: Json
              p_organization_id?: string
              p_product_id: string
              p_qty_produced: number
              p_user_id: string
            }
            Returns: string
          }
      record_manual_sale: {
        Args: {
          p_organization_id: string
          p_payment_method: string
          p_product_id: string
          p_qty: number
          p_user_id: string
        }
        Returns: Json
      }
      remove_org_member: {
        Args: { p_member_user_id: string; p_organization_id: string }
        Returns: Json
      }
      smart_delete_item: {
        Args: { table_name: string; target_id: string }
        Returns: string
      }
      update_org_member_phone: {
        Args: {
          p_member_user_id: string
          p_organization_id: string
          p_phone: string
        }
        Returns: Json
      }
      update_org_member_role: {
        Args: {
          p_member_user_id: string
          p_new_role: string
          p_organization_id: string
        }
        Returns: Json
      }
      update_organization_settings: {
        Args: {
          p_logo_url?: string
          p_organization_id: string
          p_theme_accent?: string
          p_theme_background?: string
          p_theme_foreground?: string
          p_theme_mode?: string
          p_theme_primary_color?: string
        }
        Returns: Json
      }
      update_product_recipe:
        | {
            Args: { p_ingredients: Json; p_product_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_ingredients: Json
              p_organization_id: string
              p_product_id: string
            }
            Returns: undefined
          }
    }
    Enums: {
      invite_role:
        | "staff"
        | "admin"
        | "marketing"
        | "logistics"
        | "analyst"
        | "sales"
      post_type: "idea" | "task" | "shoutout" | "general"
      sale_status: "pending" | "paid" | "cancelled"
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
      invite_role: [
        "staff",
        "admin",
        "marketing",
        "logistics",
        "analyst",
        "sales",
      ],
      post_type: ["idea", "task", "shoutout", "general"],
      sale_status: ["pending", "paid", "cancelled"],
    },
  },
} as const
