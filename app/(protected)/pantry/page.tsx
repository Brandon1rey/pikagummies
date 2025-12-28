import { createClient } from "@/lib/supabase/server";
import { PantryClient } from "@/components/pantry/pantry-client";
import { redirect } from "next/navigation";

export default async function PantryPage() {
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

    // Fetch raw materials
    const { data: rawMaterials } = await supabase
        .from("raw_materials")
        .select("*")
        .order("name");

    return <PantryClient initialStock={rawMaterials || []} user={user} organizationId={organizationId} />;
}
