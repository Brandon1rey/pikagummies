/**
 * POST /api/bot/products/create - Create a new finished product
 * 
 * Used by Ops Bot when creating products with recipes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const createProductSchema = z.object({
    name: z.string().min(1),
    sale_price: z.number().nonnegative().default(0),
    current_stock: z.number().nonnegative().default(0),
    is_active: z.boolean().default(true),
    organization_id: z.string().uuid()
})

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({}, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = createProductSchema.parse(body)

        // Normalize name to UPPERCASE
        const normalizedName = payload.name.trim().toUpperCase()

        const supabase = createServiceRoleClient()

        // Check if product already exists
        const { data: existing } = await (supabase
            .from('finished_products') as any)
            .select('id, name')
            .eq('organization_id', payload.organization_id)
            .eq('name', normalizedName)
            .single()

        if (existing) {
            return NextResponse.json({
                success: true,
                message: `Producto ya existe: ${normalizedName}`,
                product_id: existing.id,
                data: existing,
                already_exists: true
            })
        }

        // Create new product
        const { data: newProduct, error } = await (supabase
            .from('finished_products') as any)
            .insert({
                name: normalizedName,
                sale_price: payload.sale_price,
                current_stock: payload.current_stock,
                is_active: payload.is_active,
                organization_id: payload.organization_id
            })
            .select('id, name, sale_price')
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `Producto creado: ${normalizedName}`,
            product_id: newProduct?.id,
            data: newProduct
        })

    } catch (error: any) {
        console.error('Error creating product:', error)
        return NextResponse.json({
            error: error.message || 'Error creating product'
        }, { status: 400 })
    }
}
