/**
 * POST /api/bot/sales/record - Registrar una venta manual
 * Used by Ops Bot to record manual sales (made by humans, not the sales bot)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

// Validar que la cantidad sea positiva, pero PERMITIR decimales (remove .int())
const manualSaleSchema = z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive(),
    total_amount: z.number().positive(),
    customer_phone: z.string().optional().nullable(),
    organization_id: z.string().uuid()
})

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = manualSaleSchema.parse(body)

        const supabase = createServiceRoleClient()

        // 2. Call the Stored Procedure (Centralized Logic)
        // This ensures Retail/Manufacturing logic is respected (check migration v6)
        const { error } = await (supabase.rpc as any)('record_manual_sale', {
            p_product_id: payload.product_id,
            p_qty: payload.quantity,
            p_payment_method: 'cash', // Default for now
            p_user_id: '00000000-0000-0000-0000-000000000002', // Ops Bot UUID
            p_organization_id: payload.organization_id
        })

        if (error) {
            // Check for specific custom errors from PG
            if (error.message.includes('Not enough stock')) {
                return NextResponse.json({ error: error.message }, { status: 400 })
            }
            throw error
        }

        return NextResponse.json({
            success: true,
            message: 'Sale recorded via RPC'
        })

    } catch (error: any) {
        console.error('Error recording manual sale:', error)
        // Zod Error Handling
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 })
        }

        return NextResponse.json({
            error: error.message || 'Error recording sale'
        }, { status: 400 })
    }
}
