import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSuperAdmin } from "@/lib/auth/super-admin"

// This page explains that "Admin" no longer means "Super Admin"
// Regular tenant admins are redirected

export default async function AdminPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Check if they are Super Admin
    const isSuperAdminUser = await isSuperAdmin()

    if (isSuperAdminUser) {
        // Redirect super admins to the proper super-admin tenants page
        redirect("/tenants")
    }

    // Regular admins see this page
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, organization_id")
        .eq("id", user.id)
        .single()

    if (!profile?.is_admin) {
        redirect("/")
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <div className="bg-stone-900 border border-white/10 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Your Admin Powers</h3>
                <p className="text-muted-foreground mb-4">
                    As a Tenant Admin, you can manage your organization's team members and settings.
                </p>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        ✅ <span>Invite new team members via <a href="/team/invites" className="text-purple-400 underline">Invites</a></span>
                    </li>
                    <li className="flex items-center gap-2">
                        ✅ <span>Manage team posts and communication</span>
                    </li>
                    <li className="flex items-center gap-2">
                        ✅ <span>View and manage your organization's data</span>
                    </li>
                    <li className="flex items-center gap-2 text-zinc-500">
                        ❌ <span>Create new organizations (Platform Owner only)</span>
                    </li>
                </ul>
            </div>
        </div>
    )
}
