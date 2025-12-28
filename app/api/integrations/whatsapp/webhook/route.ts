import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        console.log("Webhook Verified!")
        return new NextResponse(challenge, { status: 200 })
    }

    console.error("Webhook Verification Failed", { mode, token })
    return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const supabase = createServiceRoleClient()

        // 1. Basic Validation
        const entry = body.entry?.[0]
        const changes = entry?.changes?.[0]
        const value = changes?.value
        const message = value?.messages?.[0]
        const statuses = value?.statuses?.[0]

        // If it's just a status update (read/delivered), ignore for now
        if (statuses) {
            return NextResponse.json({ ok: true })
        }

        if (!message) {
            return NextResponse.json({ ok: true }) // Not a message/status we care about
        }

        const messageId = message.id

        // 2. Idempotency Check
        const { error: idempError } = await supabase
            .from('webhook_events')
            .insert({ event_id: messageId, payload: body })

        if (idempError) {
            // Postgres Unique Violation code is 23505, but Supabase generic error might differ. 
            // Assuming any error on insert of unique key means duplicate.
            console.log('Duplicate Webhook or Insert Error:', messageId, idempError.message)
            return NextResponse.json({ ok: true })
        }

        // 3. Resolve Tenant
        const channelId = value.metadata?.phone_number_id
        const { data: channel } = await supabase
            .from('organization_channels')
            .select('organization_id')
            .eq('phone_number_id', channelId)
            .single()

        if (!channel) {
            console.error('Unknown Channel ID (No Tenant Linked):', channelId)
            // We still return 200 to stop Meta from retrying, as this is a configuration error, not transient.
            return NextResponse.json({ ok: true })
        }

        console.log(`Forwarding message from ${message.from} to Bot (Org: ${channel.organization_id})`)

        // 4. Forward to Python Brain (Fire and Forget strategy to keep response fast)
        // We expect the Python service to be running at PYTHON_BOT_URL
        const botUrl = process.env.PYTHON_BOT_URL || 'http://localhost:8000'

        fetch(`${botUrl}/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Pikagoma-Org-ID': channel.organization_id,
                'X-Bot-Service-Token': process.env.BOT_SERVICE_TOKEN!
            },
            body: JSON.stringify(body)
        })
            .then(async (res) => {
                if (!res.ok) {
                    console.error("Bot Server Error:", await res.text())
                }
            })
            .catch(err => console.error("Failed to forward to Python:", err))

        return NextResponse.json({ ok: true })

    } catch (e) {
        console.error("Internal Webhook Error:", e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
