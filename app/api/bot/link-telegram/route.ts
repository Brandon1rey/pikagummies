/**
 * POST /api/bot/link-telegram - Link Telegram account to profile
 * 
 * Security: Requires BOTH user_id AND phone to match for linking.
 * This prevents unauthorized linking by anyone who only knows one piece of info.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const linkSchema = z.object({
    telegram_id: z.string().min(1),
    user_id: z.string().uuid(),
    phone: z.string().min(10)
})

export async function POST(request: NextRequest) {
    // Security: Bot service token required
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { telegram_id, user_id, phone } = linkSchema.parse(body)

        const supabase = createServiceRoleClient()

        // 1. Normalize phone (remove spaces, ensure format)
        const normalizedPhone = phone.replace(/\s+/g, '').replace(/^(\+)?/, '+')

        // 2. Check if this telegram_id is already linked to someone else
        const { data: existingLink } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('telegram_id', telegram_id)
            .single()

        if (existingLink) {
            return NextResponse.json({
                error: 'Este Telegram ya está vinculado a otra cuenta.',
                already_linked: true
            }, { status: 400 })
        }

        // 3. Find profile by BOTH user_id AND phone (dual-factor security)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, phone, organization_id, role')
            .eq('id', user_id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({
                error: 'User ID no encontrado. Verifica que sea correcto.',
                code: 'USER_NOT_FOUND'
            }, { status: 404 })
        }

        // 4. Verify phone matches
        const profilePhone = profile.phone?.replace(/\s+/g, '').replace(/^(\+)?/, '+')
        if (profilePhone !== normalizedPhone) {
            return NextResponse.json({
                error: 'El número de teléfono no coincide con el perfil.',
                code: 'PHONE_MISMATCH'
            }, { status: 400 })
        }

        // 5. Link the Telegram ID
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ telegram_id: telegram_id })
            .eq('id', user_id)

        if (updateError) {
            throw updateError
        }

        // 6. Get organization info for confirmation
        let orgName = null
        if (profile.organization_id) {
            const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', profile.organization_id)
                .single()
            orgName = org?.name
        }

        return NextResponse.json({
            success: true,
            message: 'Telegram vinculado exitosamente',
            profile: {
                name: profile.full_name,
                role: profile.role,
                organization: orgName
            }
        })

    } catch (error: any) {
        console.error('Error linking Telegram:', error)

        if (error.code === '23505') { // Unique constraint violation
            return NextResponse.json({
                error: 'Este Telegram ya está vinculado a otra cuenta.',
                code: 'DUPLICATE_TELEGRAM'
            }, { status: 400 })
        }

        return NextResponse.json({
            error: error.message || 'Error al vincular Telegram'
        }, { status: 500 })
    }
}
