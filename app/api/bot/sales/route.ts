import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const saleSchema = z.object({
    product_name: z.string(),
    quantity: z.number().int().positive(),
    shipping_address: z.string().optional(),
    customer_phone: z.string(),
    organization_id: z.string().uuid()
})

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { product_name, quantity, organization_id } = saleSchema.parse(body)

        const supabase = createServiceRoleClient()

        // A. Resolve Product ID
        const { data: products } = await (supabase
            .from('finished_products') as any)
            .select('id, sale_price')
            .eq('organization_id', organization_id)
            .ilike('name', product_name)
            .limit(1)

        if (!products || products.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = products[0]

        // B. Execute RPC (Atomic Sale)
        const { error: rpcError } = await (supabase.rpc as any)('record_manual_sale', {
            p_product_id: product.id,
            p_qty: quantity,
            p_payment_method: 'whatsapp_bot',
            p_user_id: '00000000-0000-0000-0000-000000000001', // Sales Bot ID
            p_organization_id: organization_id
        })

        if (rpcError) throw rpcError

        return NextResponse.json({ success: true, message: 'Sale recorded' })

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid Request' }, { status: 400 })
    }
}
