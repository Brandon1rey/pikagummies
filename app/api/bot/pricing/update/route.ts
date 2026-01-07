import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const updateSchema = z.object({
    product_id: z.string().uuid(),
    new_price: z.number().nonnegative(),
    organization_id: z.string().uuid()
})

/**
 * POST /api/bot/pricing/update
 * 
 * Updates the sale price of a finished product.
 * Used by the Ops Bot to change prices on the fly.
 */
import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { product_id, new_price, organization_id } = updateSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Atomic update with org scope for security
        const { data, error } = await (supabase
            .from('finished_products') as any)
            .update({ sale_price: new_price })
            .eq('id', product_id)
            .eq('organization_id', organization_id) // Strict tenant isolation
            .select('id, name, sale_price')
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            product: data
        })

    } catch (e: any) {
        console.error("Pricing Update Error:", e)
        return NextResponse.json({ error: e.message }, { status: 400 })
    }
}
