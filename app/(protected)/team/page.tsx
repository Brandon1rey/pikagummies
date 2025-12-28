import { createClient } from "@/lib/supabase/server";
import { TeamBoard } from "@/components/team/team-board";
import { redirect } from "next/navigation";

export default async function TeamPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // 1. Try Metadata
    let organizationId = user.user_metadata.organization_id

    // 2. Fallback to Profile
    if (!organizationId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single()
        organizationId = profile?.organization_id
    }

    if (!organizationId) {
        return (
            <div className="flex h-full items-center justify-center text-stone-500">
                No Organization Selected
            </div>
        )
    }

    // Fetch team posts with author details
    const { data: posts } = await supabase
        .from("team_posts")
        .select(`
      *,
      profiles (
        full_name,
        avatar_url,
        role
      )
    `)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Team Sync 🧠</h1>
                <p className="text-muted-foreground">
                    Share ideas, assign tasks, and shout out your teammates.
                </p>
            </div>

            <TeamBoard initialPosts={posts || []} currentUserId={user.id} organizationId={organizationId} />
        </div>
    );
}
