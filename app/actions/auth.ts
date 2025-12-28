'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginUser(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    console.log('🔒 [SERVER] Login Attempt for:', email)

    if (!email || !password) {
        console.error('❌ [SERVER] Validation Failed: Missing credentials')
        return { success: false, error: 'Email and password are required' }
    }

    try {
        const supabase = await createClient()

        console.log('🔑 [SERVER] Calling Supabase signInWithPassword...')
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('❌ [SERVER] Supabase Error:', error.message)
            return { success: false, error: error.message }
        }

        if (data.user) {
            console.log('✅ [SERVER] Session created. User ID:', data.user.id)
            console.log('📧 [SERVER] User Email:', data.user.email)
            return { success: true }
        }

        console.error('❌ [SERVER] Unknown Error: No user data returned')
        return { success: false, error: 'Authentication failed' }

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Server error occurred'
        console.error('💥 [SERVER] Critical Exception:', err)
        return { success: false, error: errorMessage }
    }
}

export async function signOut() {
    const supabase = await createClient()
    
    console.log('🚪 [SERVER] Signing out user...')
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
        console.error('❌ [SERVER] Sign out error:', error.message)
        // Still redirect even if there's an error - the user wants out
    }
    
    console.log('✅ [SERVER] User signed out, redirecting to login')
    redirect('/login')
}
