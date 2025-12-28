import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * Meta-Native Identity Resolution API
 * 
 * This endpoint resolves user identity and organization for the bot gateway.
 * 
 * Query Params:
 * - phone: Sender's phone number (customer or staff)
 * - channel_id: Meta's phone_number_id from webhook (for customer routing)
 * 
 * Returns:
 * - type: 'staff' | 'customer' | 'anonymous'
 * - organization: The org data if resolved
 */
export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')           // Sender's phone number
    const channelId = searchParams.get('channel_id') // Meta's phone_number_id from webhook

    if (!phone) return NextResponse.json({ error: 'Missing Phone' }, { status: 400 })

    const supabase = createServiceRoleClient()

    try {
        // 0. TELEGRAM USERS: Check by telegram_id FIRST (if this is a Telegram channel)
        if (channelId?.startsWith('telegram:')) {
            const telegramId = channelId.replace('telegram:', '')

            const { data: telegramProfile } = await (supabase
                .from('profiles' as any)
                .select('id, full_name, role, organization_id, telegram_id')
                .eq('telegram_id', telegramId)
                .single())

            const telegramProfileData = telegramProfile as any

            if (telegramProfileData && telegramProfileData.organization_id) {
                // STAFF recognized by Telegram ID!
                const { data: settings } = await (supabase
                    .from('organization_settings' as any)
                    .select('business_description, terminology, theme_primary_color, module_inventory, module_production, module_recipes')
                    .eq('organization_id', telegramProfileData.organization_id)
                    .single())

                const { data: org } = await (supabase
                    .from('organizations' as any)
                    .select('name, slug')
                    .eq('id', telegramProfileData.organization_id)
                    .single())

                const orgData = org as any

                return NextResponse.json({
                    type: 'staff',
                    platform: 'telegram',
                    user: {
                        id: telegramProfileData.id,
                        name: telegramProfileData.full_name,
                        role: telegramProfileData.role
                    },
                    organization: {
                        id: telegramProfileData.organization_id,
                        name: orgData?.name,
                        slug: orgData?.slug,
                        settings: settings || {}
                    }
                })
            }
            // If not found by telegram_id, continue to check organization_channels (unlinking flow)
        }

        // 1. Check if they are STAFF by phone (WhatsApp users)
        const { data: profile, error } = await (supabase
            .from('profiles' as any)
            .select('id, full_name, role, organization_id')
            .eq('phone', phone)
            .single())

        if (error && error.code !== 'PGRST116') { // Ignore "Not found" error
            throw error
        }

        const profileData = profile as any

        if (profileData && profileData.organization_id) {
            // STAFF: Fetch Org Settings (Terminology, Name)
            const { data: settings } = await (supabase
                .from('organization_settings' as any)
                .select('business_description, terminology, theme_primary_color, module_inventory, module_production, module_recipes')
                .eq('organization_id', profileData.organization_id)
                .single())

            const { data: org } = await (supabase
                .from('organizations' as any)
                .select('name, slug')
                .eq('id', profileData.organization_id)
                .single())

            const orgData = org as any

            return NextResponse.json({
                type: 'staff',
                user: {
                    id: profileData.id,
                    name: profileData.full_name,
                    role: profileData.role
                },
                organization: {
                    id: profileData.organization_id,
                    name: orgData?.name,
                    slug: orgData?.slug,
                    settings: settings || {}
                }
            })
        }

        // 2. CUSTOMER/EXTERNAL: Resolve org from channel_id (organization_channels)
        if (channelId) {
            let lookupChannelId = channelId
            let platform = 'whatsapp'

            // Check if this is a Telegram channel (telegram:chat_id format)
            if (channelId.startsWith('telegram:')) {
                platform = 'telegram'
                // For Telegram, we look up by platform, not by chat_id
                // The bot token should be in phone_number_id
                lookupChannelId = 'telegram' // Will match platform='telegram' entries
            }

            // Query organization_channels
            let query = supabase
                .from('organization_channels' as any)
                .select('organization_id, platform')

            if (platform === 'telegram') {
                // For Telegram, find any org with Telegram enabled
                query = query.eq('platform', 'telegram')
            } else {
                // For WhatsApp, match the phone_number_id
                query = query.eq('phone_number_id', lookupChannelId)
            }

            const { data: channel, error: channelError } = await query.single()

            const channelData = channel as any

            if (!channelError && channelData) {
                // Found the org for this channel
                const { data: org } = await (supabase
                    .from('organizations' as any)
                    .select('name, slug')
                    .eq('id', channelData.organization_id)
                    .single())

                const { data: settings } = await (supabase
                    .from('organization_settings' as any)
                    .select('business_description, terminology')
                    .eq('organization_id', channelData.organization_id)
                    .single())

                const orgData = org as any

                // For Telegram, also check if this user is staff by telegram_id
                // (Future enhancement: add telegram_id column to profiles)

                return NextResponse.json({
                    type: 'customer',
                    organization_id: channelData.organization_id,
                    organization: {
                        id: channelData.organization_id,
                        name: orgData?.name,
                        slug: orgData?.slug,
                        settings: settings || {},
                        platform: platform
                    }
                })
            }
        }

        // 3. No channel_id or not found: Anonymous with no org
        return NextResponse.json({
            type: 'anonymous',
            organization_id: null,
            error: channelId ? 'Channel ID not registered' : 'No channel ID provided'
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
