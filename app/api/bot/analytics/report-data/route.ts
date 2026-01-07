import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')
    const period = searchParams.get('period') || 'today'
    const type = searchParams.get('type') || 'sales' // sales | expenses

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    // 1. Calculate Time Range (Copied from existing analytics route)
    const now = new Date()
    let startDate = new Date()

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        startDate.setDate(diff)
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const startIso = startDate.toISOString()

    try {
        let data: any[] = []
        let error = null

        if (type === 'sales') {
            // Fetch Sales with Product Name and Unit
            const res = await supabase
                .from('sales')
                .select(`
                    id,
                    quantity,
                    total_amount,
                    created_at,
                    customer_phone,
                    finished_products ( name, unit )
                `)
                .eq('organization_id', orgId)
                .gte('created_at', startIso)
                .order('created_at', { ascending: false })

            if (res.error) throw res.error

            // Flatten generic data structure
            data = res.data.map((s: any) => ({
                item: s.finished_products?.name || 'Desconocido',
                unit: s.finished_products?.unit || 'pz',
                qty: s.quantity,
                amount: s.total_amount,
                date: s.created_at,
                phone: s.customer_phone || '-'
            }))

        } else if (type === 'expenses') {
            // Fetch Expenses
            const res = await supabase
                .from('expenses')
                .select(`
                    id,
                    category,
                    description,
                    amount,
                    date
                `)
                .eq('organization_id', orgId)
                .gte('date', startIso)
                .order('date', { ascending: false })

            if (res.error) throw res.error

            data = res.data.map((e: any) => ({
                category: e.category,
                description: e.description,
                amount: e.amount,
                date: e.date
            }))
        }

        return NextResponse.json({
            period,
            type,
            data
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
