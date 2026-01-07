import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function GET(request: NextRequest) {
    // 1. Security Gate
    const receivedToken = request.headers.get('X-Bot-Service-Token')
    const expectedToken = process.env.BOT_SERVICE_TOKEN

    console.log("🔒 AUTH DEBUG:")
    console.log("   -> Received from Bot:", receivedToken)
    console.log("   -> Expected by Server:", expectedToken)

    if (!validateToken_Safe(receivedToken, expectedToken)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const orgId = searchParams.get('organization_id')

    if (!orgId) {
        return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    let dbQuery = (supabase
        .from('finished_products') as any)
        .select('id, name, sale_price, current_stock, description, is_active, unit, package_weight, weight_unit')
        .eq('organization_id', orgId)
        .eq('is_active', true)

    if (query !== 'ALL') {
        dbQuery = dbQuery.ilike('name', `%${query}%`).limit(10)
    } else {
        // For reports, we want everything (capped at 1000 safe margin)
        dbQuery = dbQuery.limit(1000)
    }

    const { data, error } = await dbQuery

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
}
