import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    try {
        // Query top products by revenue for this organization (last 3 months)
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('finished_product_id, quantity, total_amount')
            .eq('organization_id', orgId)
            .gte('created_at', threeMonthsAgo.toISOString())

        if (salesError) throw salesError

        // Get product names
        const productIds = [...new Set(
            (salesData as any[])
                ?.map(s => s.finished_product_id)
                .filter((id): id is string => id !== null && id !== undefined)
            || []
        )]

        if (productIds.length === 0) {
            return NextResponse.json({ data: [] })
        }

        const { data: productsData } = await (supabase
            .from('finished_products') as any)
            .select('id, name')
            .in('id', productIds)

        const productMap = new Map((productsData as any[])?.map(p => [p.id, p.name]) || [])

        // Aggregate by product
        const productStats: Record<string, { name: string; revenue: number; sales: number }> = {}

            ; (salesData as any[])?.forEach(sale => {
                const id = sale.finished_product_id
                if (!id) return
                if (!productStats[id]) {
                    productStats[id] = {
                        name: productMap.get(id) || 'Unknown',
                        revenue: 0,
                        sales: 0
                    }
                }
                productStats[id].revenue += Number(sale.total_amount)
                productStats[id].sales += sale.quantity
            })

        // Sort by revenue and take top 5
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        return NextResponse.json({ data: topProducts })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
