/**
 * Telegram Webhook Handler
 * =========================
 * Receives updates from Telegram Bot API and forwards to Python bot.
 * 
 * Setup:
 * 1. Create bot via @BotFather
 * 2. Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=YOUR_URL&secret_token=SECRET
 */

import { NextRequest, NextResponse } from 'next/server'

const BOT_SERVICE_TOKEN = process.env.BOT_SERVICE_TOKEN
const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN
const PYTHON_BOT_URL = process.env.PYTHON_BOT_URL || 'http://localhost:8000'

import { validateToken_Safe } from '@/lib/security/timing-safe'

// ... existing code

export async function POST(request: NextRequest) {
    // 1. Verify Telegram Secret Token
    const telegramSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

    if (TELEGRAM_SECRET_TOKEN && !validateToken_Safe(telegramSecret, TELEGRAM_SECRET_TOKEN)) {
        console.warn('⚠️ Invalid Telegram secret token')
        return NextResponse.json({ ok: false }, { status: 403 })
    }

    try {
        const update = await request.json()
        console.log('📱 Telegram Update:', JSON.stringify(update, null, 2))

        // 2. Extract message data
        const message = update.message || update.edited_message
        if (!message) {
            // Not a message update (could be callback, inline query, etc.)
            return NextResponse.json({ ok: true })
        }

        const chatId = message.chat?.id
        const userId = message.from?.id
        const text = message.text || message.caption || ''
        const photo = message.photo // Array of PhotoSize, last is highest resolution

        if (!chatId) {
            return NextResponse.json({ ok: true })
        }

        // 3. Handle photo if present
        let photoFileId: string | null = null
        if (photo && photo.length > 0) {
            // Get highest resolution photo (last in array)
            photoFileId = photo[photo.length - 1].file_id
            console.log('📷 Photo received, file_id:', photoFileId)
        }

        // 4. Forward to Python Bot
        const payload = {
            platform: 'telegram',
            chat_id: chatId.toString(),
            user_id: userId?.toString() || chatId.toString(),
            username: message.from?.username || null,
            first_name: message.from?.first_name || null,
            text: text,
            photo_file_id: photoFileId,
            raw_message: message
        }

        try {
            const botResponse = await fetch(`${PYTHON_BOT_URL}/webhook/telegram`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Service-Token': BOT_SERVICE_TOKEN || ''
                },
                body: JSON.stringify(payload)
            })

            if (!botResponse.ok) {
                console.error('❌ Python bot error:', await botResponse.text())
            }
        } catch (err) {
            console.error('❌ Failed to reach Python bot:', err)
        }

        return NextResponse.json({ ok: true })

    } catch (error) {
        console.error('❌ Telegram webhook error:', error)
        return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: 'Telegram webhook active',
        timestamp: new Date().toISOString()
    })
}
