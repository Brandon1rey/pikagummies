import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')

    if (!chatId) return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 })

    const supabase = createServiceRoleClient()

    const { data } = await (supabase as any).from('bot_sessions')
        .select('*')
        .eq('chat_id', chatId)
        .single()

    // Check expiry
    if (data && new Date(data.expires_at) < new Date()) {
        await (supabase as any).from('bot_sessions').delete().eq('chat_id', chatId)
        return NextResponse.json({ session: null })
    }

    return NextResponse.json({ session: data ? data.context : null })
}

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    try {
        const body = await request.json()
        const { chat_id, context, ttl_seconds } = body

        if (!chat_id || !context) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

        const supabase = createServiceRoleClient()

        // Calculate expiry
        const ttl = ttl_seconds || 3600 // 1 hour default
        const expires_at = new Date(Date.now() + ttl * 1000).toISOString()

        const { error } = await (supabase as any).from('bot_sessions').upsert({
            chat_id,
            context,
            updated_at: new Date().toISOString(),
            expires_at
        })

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chat_id')

    if (!chatId) return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    await (supabase as any).from('bot_sessions').delete().eq('chat_id', chatId)

    return NextResponse.json({ success: true })
}
