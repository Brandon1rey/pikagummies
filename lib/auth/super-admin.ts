import { createClient } from '@/lib/supabase/server'

/**
 * Check if the current user is a Platform Admin (God Mode)
 * Platform admins are stored in the `platform_admins` database table.
 * Only platform admins can access /tenants and manage organizations.
 */
export async function isSuperAdmin(): Promise<boolean> {
    const supabase = await createClient()

    // Call the database RPC that checks the platform_admins table
    const { data, error } = await supabase.rpc('is_platform_admin')

    if (error) {
        console.error('Error checking platform admin status:', error)
        return false
    }

    return data === true
}

export async function requireSuperAdmin(): Promise<void> {
    const isAllowed = await isSuperAdmin()
    if (!isAllowed) {
        throw new Error('Access Denied: Platform Admin privileges required')
    }
}

