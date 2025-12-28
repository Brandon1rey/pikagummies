export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface RawMaterial {
    id: string
    name: string
    unit: string
    current_stock: number
    average_cost: number
    emoji: string | null
    is_active: boolean
}

export interface FinishedProduct {
    id: string
    name: string
    description: string | null
    sale_price: number
    current_stock: number
    unit?: string
    package_weight?: number
    weight_unit?: string
    is_public: boolean
    is_active: boolean
}

export interface Recipe {
    id: string
    finished_product_id: string
    raw_material_id: string
    qty_required: number
    created_by: string | null
    created_at: string
}

export interface ProductionBatch {
    id: string
    finished_product_id: string
    quantity_produced: number
    total_batch_cost: number
    created_at: string
    created_by: string | null
}

export interface Sale {
    id: string
    finished_product_id: string
    quantity: number
    total_amount: number
    customer_phone: string | null
    status: 'pending' | 'paid' | 'cancelled'
    created_at: string
    created_by: string | null
}

export interface Expense {
    id: string
    category: string
    amount: number
    description: string | null
    date: string
    created_by: string | null
    created_at: string
}

export interface Profile {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
    role: 'staff' | 'admin'
    updated_at: string
    is_admin: boolean
}

export interface TeamPost {
    id: string
    author_id: string | null
    content: string
    type: 'idea' | 'task' | 'shoutout' | 'general'
    is_resolved: boolean
    created_at: string
}

export interface DashboardFinancials {
    month: string
    type: 'revenue' | 'cogs' | 'opex'
    amount: number
}

export interface SaleRecord {
    id: string
    product_name: string
    quantity: number
    total_amount: number
    created_at: string
    sold_by_email: string | null
}
