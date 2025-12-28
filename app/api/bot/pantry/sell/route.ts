
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { normalizeUnit } from '@/lib/units'

// Validation Schema
const sellMaterialSchema = z.object({
    name: z.string(),
    qty: z.number().positive(),
    total_price: z.number().nonnegative(),
    unit: z.string().default('pz'),
    organization_id: z.string().uuid(),
    customer_phone: z.string().optional().nullable()
})

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = sellMaterialSchema.parse(body)
        const normalizedName = payload.name.trim().toUpperCase()
        const normalizedUnit = normalizeUnit(payload.unit)

        const supabase = createServiceRoleClient()

        // 2. Check Stock (Raw Materials)
        const { data: material, error: fetchError } = await (supabase.from('raw_materials') as any)
            .select('id, current_stock, unit, name')
            .eq('organization_id', payload.organization_id)
            .eq('name', normalizedName)
            .eq('is_active', true)
            .single()

        if (fetchError || !material) {
            return NextResponse.json({
                error: `Material no encontrado: ${payload.name}`
            }, { status: 404 })
        }

        // 3. Validate Availability
        // Note: We might need unit conversion logic here in the future if units differ
        // For now, we assume simple unit match or rely on user specifying correct unit
        if (material.current_stock < payload.qty) {
            return NextResponse.json({
                error: `Stock insuficiente. Tienes ${material.current_stock} ${material.unit}, intentas vender ${payload.qty}.`
            }, { status: 400 })
        }

        // 4. Update Stock (Decrement)
        const newStock = material.current_stock - payload.qty
        const { error: updateError } = await (supabase.from('raw_materials') as any)
            .update({ current_stock: newStock })
            .eq('id', material.id)

        if (updateError) throw updateError

        // 5. Record Sale (Revenue)
        const { error: saleError } = await (supabase.from('sales') as any)
            .insert({
                finished_product_id: null, // It's a raw material
                quantity: payload.qty,
                total_amount: payload.total_price,
                customer_phone: payload.customer_phone,
                status: 'paid',
                created_by: '00000000-0000-0000-0000-000000000002', // Ops Bot
                organization_id: payload.organization_id
            })

        if (saleError) {
            // CRITICAL: If sale fails, we should ideally rollback stock.
            // But Supabase HTTP client doesn't support transactions easily without RPC.
            // We will just log error and return. (In production, use RPC for atomicity).
            console.error('Error creating sale record:', saleError)
            // Attempt to revert stock?
            await (supabase.from('raw_materials') as any)
                .update({ current_stock: material.current_stock })
                .eq('id', material.id)

            throw saleError
        }

        return NextResponse.json({
            success: true,
            message: `Venta registrada: ${payload.qty} ${normalizedUnit} de ${normalizedName}`,
            new_stock: newStock
        })

    } catch (error: any) {
        console.error('Error selling material:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 })
        }
        return NextResponse.json({
            error: error.message || 'Error processing sale'
        }, { status: 400 })
    }
}
