"use server"

import { createClient } from "@supabase/supabase-js"
import { isSuperAdmin } from "@/lib/auth/super-admin"

// We need the Service Role Key to create users via the Admin API
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export async function createTenantAction(formData: any) {
    // SUPER ADMIN GUARD - Only platform owners can create tenants
    const isAllowed = await isSuperAdmin()
    if (!isAllowed) {
        return { success: false, error: "Access Denied: Only Platform Admins can create Organizations." }
    }

    const { name, slug, admin_email, password, business_type, theme_color } = formData

    try {
        // 1. Create the Auth User
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: admin_email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: "Admin " + name,
            }
        })

        if (userError) throw userError
        if (!userData.user) throw new Error("Failed to create user")

        const userId = userData.user.id
        const isCrafting = business_type === "crafting" || business_type === "manufacturing"

        // 2. Call the RPC to create the tenant and link the user
        // NOTE: The RPC already inserts a placeholder into organization_channels 
        // with phone_number_id = "{slug}-wa". We will UPDATE it with the real Meta ID.
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("create_tenant", {
            p_name: name,
            p_slug: slug,
            p_admin_email: admin_email,
            p_admin_uid: userId,
            p_is_crafting: isCrafting,
            p_theme_color: theme_color,
            p_terminology: formData.terminology
        })

        if (rpcError) throw rpcError

        // 3. Get the org_id by querying the organization by slug
        // PRESERVED: RPC returns {status, slug} JSONB, not UUID directly
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations' as any)
            .select('id')
            .eq('slug', slug)
            .single()

        if (orgError || !org) {
            console.error("Could not find organization after creation:", orgError)
            return { success: true, data: rpcData }
        }

        const orgId = (org as any).id as string

        // 4. UPDATE organization_channels with Meta Phone Number ID
        // The RPC already created a row with placeholder "{slug}-wa"
        // We update it with the real Meta phone_number_id if provided
        if (formData.meta_phone_number_id) {
            const { error: channelError } = await supabaseAdmin
                .from('organization_channels' as any)
                .update({
                    phone_number_id: formData.meta_phone_number_id.trim()
                })
                .eq('organization_id', orgId)
                .eq('platform', 'whatsapp')

            if (channelError) {
                console.error("Organization Channel Update Error:", channelError)
                // Non-critical: RPC already created a placeholder
            }
        }

        // 5. Update Admin's profile with personal phone (for Ops Bot access)
        if (formData.admin_personal_phone) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles' as any)
                .update({
                    phone: formData.admin_personal_phone.trim()
                })
                .eq('id', userId)

            if (profileError) {
                console.error("Admin Profile Phone Update Error:", profileError)
            }
        }

        return { success: true, data: rpcData }
    } catch (error: any) {
        console.error("Create Tenant Error:", error)
        return { success: false, error: error.message }
    }
}
