'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================
// TENANT ADMIN ACTIONS (Invite Management)
// =============================================

export async function createInvite(formData: FormData) {
    const supabase = await createClient()

    // 1. Get Current User's Context
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    // 2. Get User's Org (Security Check)
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, is_admin')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return { error: 'Profile not found' }
    }

    // Only admins can invite
    if (!profile.is_admin && profile.role !== 'admin' && profile.role !== 'owner') {
        return { error: 'Only Admins can invite staff' }
    }

    if (!profile.organization_id) {
        return { error: 'You are not part of an organization' }
    }

    // 3. Create Invite Code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const roleToAssign = formData.get('role') as 'staff' | 'admin'

    const { error } = await supabase.from('invites').insert({
        organization_id: profile.organization_id, // <--- FORCED CONTEXT (No org spoofing!)
        code: code,
        role_to_assign: roleToAssign || 'staff',
        created_by: user.id,
        status: 'active'
    })

    if (error) return { error: error.message }

    revalidatePath('/team')

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return {
        success: true,
        code: code,
        link: `${baseUrl}/invite/${code}`
    }
}

export async function getMyInvites() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in', invites: [] }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    if (!profile?.organization_id) {
        return { error: 'No organization', invites: [] }
    }

    const { data: invites, error } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message, invites: [] }

    return { invites: invites || [] }
}

export async function revokeInvite(inviteId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return { error: 'Only Admins can revoke invites' }
    }

    // Security: Only revoke invites from YOUR org
    const { error } = await supabase
        .from('invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .eq('organization_id', profile.organization_id) // <--- FORCED SCOPE

    if (error) return { error: error.message }

    revalidatePath('/team')
    return { success: true }
}
