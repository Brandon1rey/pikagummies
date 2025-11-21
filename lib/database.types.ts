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
    public: {
        Tables: {
            batch_ingredients: {
                Row: {
                    id: string
                    production_batch_id: string | null
                    qty_used: number
                    raw_material_id: string | null
                }
                Insert: {
                    id?: string
                    production_batch_id?: string | null
                    qty_used: number
                    raw_material_id?: string | null
                }
                Update: {
                    id?: string
                    production_batch_id?: string | null
                    qty_used?: number
                    raw_material_id?: string | null
                }
                Relationships: [
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
            expenses: {
                Row: {
                    amount: number
                    category: string
                    created_at: string | null
                    created_by: string | null
                    date: string | null
                    description: string | null
                    id: string
                }
                Insert: {
                    amount: number
                    category: string
                    created_at?: string | null
                    created_by?: string | null
                    date?: string | null
                    description?: string | null
                    id?: string
                }
                Update: {
                    amount?: number
                    category?: string
                    created_at?: string | null
                    created_by?: string | null
                    date?: string | null
                    description?: string | null
                    id?: string
                }
                Relationships: []
            }
            finished_products: {
                Row: {
                    current_stock: number | null
                    description: string | null
                    id: string
                    is_active: boolean | null
                    is_public: boolean | null
                    name: string
                    sale_price: number
                }
                Insert: {
                    current_stock?: number | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_public?: boolean | null
                    name: string
                    sale_price: number
                }
                Update: {
                    current_stock?: number | null
                    description?: string | null
                    id?: string
                    is_active?: boolean | null
                    is_public?: boolean | null
                    name?: string
                    sale_price?: number
                }
                Relationships: []
            }
            invites: {
                Row: {
                    code: string
                    created_at: string | null
                    created_by: string | null
                    id: string
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
                    role?: Database["public"]["Enums"]["invite_role"] | null
                    role_to_assign?: Database["public"]["Enums"]["invite_role"] | null
                    status?: string | null
                    used_by?: string | null
                }
                Relationships: []
            }
            production_batches: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    finished_product_id: string | null
                    id: string
                    quantity_produced: number
                    total_batch_cost: number
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    finished_product_id?: string | null
                    id?: string
                    quantity_produced: number
                    total_batch_cost: number
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    finished_product_id?: string | null
                    id?: string
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
                ]
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    email: string | null
                    full_name: string | null
                    id: string
                    is_admin: boolean | null
                    role: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    email?: string | null
                    full_name?: string | null
                    id: string
                    is_admin?: boolean | null
                    role?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    is_admin?: boolean | null
                    role?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            raw_materials: {
                Row: {
                    average_cost: number | null
                    current_stock: number | null
                    emoji: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    unit: string
                }
                Insert: {
                    average_cost?: number | null
                    current_stock?: number | null
                    emoji?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    unit: string
                }
                Update: {
                    average_cost?: number | null
                    current_stock?: number | null
                    emoji?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    unit?: string
                }
                Relationships: []
            }
            recipes: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    finished_product_id: string | null
                    id: string
                    qty_required: number
                    raw_material_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    finished_product_id?: string | null
                    id?: string
                    qty_required: number
                    raw_material_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    finished_product_id?: string | null
                    id?: string
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
                    quantity: number
                    status: Database["public"]["Enums"]["sale_status"] | null
                    total_amount: number
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    customer_phone?: string | null
                    finished_product_id?: string | null
                    id?: string
                    quantity: number
                    status?: Database["public"]["Enums"]["sale_status"] | null
                    total_amount: number
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    customer_phone?: string | null
                    finished_product_id?: string | null
                    id?: string
                    quantity?: number
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
                ]
            }
            team_posts: {
                Row: {
                    author_id: string | null
                    content: string
                    created_at: string | null
                    id: string
                    is_resolved: boolean | null
                    type: Database["public"]["Enums"]["post_type"] | null
                }
                Insert: {
                    author_id?: string | null
                    content: string
                    created_at?: string | null
                    id?: string
                    is_resolved?: boolean | null
                    type?: Database["public"]["Enums"]["post_type"] | null
                }
                Update: {
                    author_id?: string | null
                    content?: string
                    created_at?: string | null
                    id?: string
                    is_resolved?: boolean | null
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
                ]
            }
        }
        Views: {
            dashboard_financials: {
                Row: {
                    amount: number | null
                    month: string | null
                    type: string | null
                }
                Relationships: []
            }
        }
        Functions: {
            get_expense_breakdown:
            | {
                Args: { end_date: string; start_date: string }
                Returns: {
                    category: string
                    total_amount: number
                }[]
            }
            | {
                Args: never
                Returns: {
                    category: string
                    total_amount: number
                }[]
            }
            get_monthly_sales:
            | {
                Args: { end_date: string; start_date: string }
                Returns: {
                    month_name: string
                    total_revenue: number
                }[]
            }
            | {
                Args: never
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
            get_product_recipe: {
                Args: { p_product_id: string }
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
                Args: { end_date: string; start_date: string }
                Returns: {
                    quarter_name: string
                    total_revenue: number
                }[]
            }
            | {
                Args: never
                Returns: {
                    quarter_name: string
                    total_revenue: number
                }[]
            }
            get_sales_by_dow:
            | {
                Args: { end_date: string; start_date: string }
                Returns: {
                    day_name: string
                    sale_count: number
                    total_revenue: number
                }[]
            }
            | {
                Args: never
                Returns: {
                    day_name: string
                    sale_count: number
                    total_revenue: number
                }[]
            }
            get_sales_by_hour:
            | {
                Args: { end_date: string; start_date: string }
                Returns: {
                    hour_of_day: number
                    sale_count: number
                }[]
            }
            | {
                Args: never
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
            purchase_new_material: {
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
            record_experimental_batch: {
                Args: {
                    p_ingredients: Json
                    p_product_id: string
                    p_qty_produced: number
                    p_user_id: string
                }
                Returns: undefined
            }
            record_manual_sale: {
                Args: {
                    p_payment_method: string
                    p_product_id: string
                    p_qty: number
                    p_user_id: string
                }
                Returns: undefined
            }
            smart_delete_item: {
                Args: { table_name: string; target_id: string }
                Returns: string
            }
            update_product_recipe: {
                Args: { p_ingredients: Json; p_product_id: string }
                Returns: undefined
            }
        }
        Enums: {
            invite_role: "staff" | "admin"
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
    public: {
        Enums: {
            invite_role: ["staff", "admin"],
            post_type: ["idea", "task", "shoutout", "general"],
            sale_status: ["pending", "paid", "cancelled"],
        },
    },
} as const
