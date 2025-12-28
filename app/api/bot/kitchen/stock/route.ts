import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')
    const query = searchParams.get('query') // Optional product name filter

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    try {
        let queryBuilder = supabase
            .from('finished_products')
            .select('id, name, current_stock, sale_price, is_active')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')
            .order('name')

        // If query is provided and not 'ALL', filter by name
        if (query && query.toUpperCase() !== 'ALL') {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`).limit(10)
        } else {
            // Text based response should still be somewhat limited but 10 is too low.
            // 50 is better. Bot will truncate if too long anyway?
            // Actually, tools.py iterates all items. Telegram has 4096 char limit.
            // 50 items * ~50 chars = 2500 chars. Safe.
            queryBuilder = queryBuilder.limit(50)
        }

        const { data, error } = await queryBuilder

        if (error) throw error

        return NextResponse.json({ data: data || [] })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
