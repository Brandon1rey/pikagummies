import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TeamManagementClient } from "@/components/admin/team-management-client"

export default async function TeamManagementPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // 1. Get Current User Profile & Org
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id")
        .eq("id", user.id)
        .single()

    if (!profile?.organization_id) {
        return <div className="p-8 text-center text-red-400">You must belong to an organization to manage a team.</div>
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
        return <div className="p-8 text-center text-red-400">Access Denied: You must be an Admin or Owner.</div>
    }

    // 2. Fetch Team Members (Profile-Only Fetch)
    const { data: members, error } = await supabase
        .from("profiles")
        .select(`
            id,
            role,
            full_name,
            email,
            phone,
            avatar_url
        `)
        .eq("organization_id", profile.organization_id)
        .order('role')

    if (error) {
        console.error("Error fetching team:", error)
        return <div className="p-8 text-center text-red-400">Failed to load team members.</div>
    }

    // Map to client structure
    const mappedMembers = members.map(m => ({
        user_id: m.id,
        role: m.role || 'staff',
        profiles: {
            id: m.id, // For compatibility
            full_name: m.full_name,
            email: m.email,
            phone: m.phone,
            avatar_url: m.avatar_url
        }
    }))

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-white">Team Management</h1>
            <TeamManagementClient
                organizationId={profile.organization_id}
                members={mappedMembers}
                currentUserRole={profile.role}
                currentUserId={user.id}
            />
        </div>
    )
}
