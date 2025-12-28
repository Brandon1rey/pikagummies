import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const orgId = searchParams.get('organization_id')

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    let dbQuery = supabase
        .from('raw_materials')
        .select('id, name, current_stock, unit, average_cost, package_weight, weight_unit')
        .eq('organization_id', orgId)
        .eq('is_active', true)


    if (query !== 'ALL') {
        const stopWords = ['DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'CON', 'EN', 'PARA', 'UN', 'UNA']
        const terms = query.trim().toUpperCase()
            .split(/\s+/)
            .filter(t => t.length > 0 && !stopWords.includes(t))

        terms.forEach(term => {
            dbQuery = dbQuery.ilike('name', `%${term}%`)
        })
    }

    const { data, error } = await dbQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
}
