import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "@/components/admin/settings-client"

export default async function AdminSettingsPage() {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    // 2. Get profile and verify admin status
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, organization_id, role")
        .eq("id", user.id)
        .single()

    // Must be org admin (is_admin=true OR role in admin/owner)
    const isOrgAdmin = profile?.is_admin ||
        profile?.role === 'admin' ||
        profile?.role === 'owner'

    if (!isOrgAdmin || !profile?.organization_id) {
        redirect("/")
    }

    // 3. Get organization name and settings
    const [orgResult, settingsResult] = await Promise.all([
        supabase
            .from("organizations")
            .select("name")
            .eq("id", profile.organization_id)
            .single(),
        supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .single()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Appearance Settings</h1>
                <p className="text-muted-foreground">
                    Customize how your organization's dashboard looks.
                </p>
            </div>

            <SettingsClient
                organizationId={profile.organization_id}
                initialSettings={settingsResult.data}
                organizationName={orgResult.data?.name || 'My Organization'}
            />
        </div>
    )
}
