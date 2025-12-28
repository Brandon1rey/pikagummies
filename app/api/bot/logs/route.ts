import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const logSchema = z.object({
    organization_id: z.string().uuid(),
    customer_phone: z.string(),
    sender: z.enum(['user', 'bot']),
    message_body: z.string(),
    intent: z.string().nullable().optional()
})

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = logSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Fire and forget (don't await the error, just trigger insertion)
        // Casting to any to bypass missing type definition for crm_conversations
        await (supabase.from('crm_conversations' as any)).insert({
            organization_id: payload.organization_id,
            customer_phone: payload.customer_phone,
            sender: payload.sender,
            message_body: payload.message_body,
            intent_detected: payload.intent
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        // Logs failing shouldn't stop the bot, but we log the error
        console.error("Log Error", e)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
