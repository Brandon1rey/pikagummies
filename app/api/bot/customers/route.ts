import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const customerSchema = z.object({
    phone: z.string().min(1),
    organization_id: z.string().uuid(),
    name: z.string().nullish(),
    tags: z.array(z.string()).optional(),
    email: z.string().email().optional().or(z.literal('')),
    tax_id: z.string().optional(),
    address: z.string().optional()
})

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    try {
        const body = await request.json()
        const payload = customerSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Upsert customer
        const { data, error } = await (supabase.from('crm_customers') as any).upsert({
            phone: payload.phone,
            organization_id: payload.organization_id,
            name: payload.name || null,
            tags: payload.tags || ['new_lead'],
            email: payload.email || null,
            tax_id: payload.tax_id || null,
            address: payload.address || null
        }, {
            onConflict: 'organization_id,phone',
            ignoreDuplicates: false

        }).select()

        if (error) throw error

        return NextResponse.json({ success: true, customer: data?.[0] || null })

    } catch (error: any) {
        console.error("Customer Registration Error:", error)
        return NextResponse.json({ error: error.message || 'Error' }, { status: 400 })
    }
}

// GET endpoint to check if customer exists
export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const orgId = searchParams.get('organization_id')

    if (!phone || !orgId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    const supabase = createServiceRoleClient()

    const { data, error } = await (supabase.from('crm_customers') as any)
        .select('*')
        .eq('phone', phone)
        .eq('organization_id', orgId)
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ customer: data || null })
}
