import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')

    if (!orgId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const supabase = createServiceRoleClient()

    // Fetch Org + Settings
    const { data: org, error: orgError } = await (supabase.from('organizations') as any)
        .select('name, slug')
        .eq('id', orgId)
        .single()

    if (orgError) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

    const { data: settings } = await (supabase.from('organization_settings') as any)
        .select('*')
        .eq('organization_id', orgId)
        .single()

    return NextResponse.json({
        name: org.name,
        fiscal_name: settings?.fiscal_name,
        fiscal_id: settings?.fiscal_id,
        fiscal_address: settings?.fiscal_address,
        contact_phone: settings?.contact_phone,
        contact_email: settings?.contact_email,
        footer_message: settings?.receipt_footer_message
    })
}
