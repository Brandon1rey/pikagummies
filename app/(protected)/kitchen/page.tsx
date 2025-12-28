import { createClient } from "@/lib/supabase/server"
import { KitchenClient } from "@/components/kitchen/kitchen-client"
import { redirect } from "next/navigation"

export default async function KitchenPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
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

    // Fetch initial data for the client component (scoped to organization)
    const [productsResult, materialsResult] = await Promise.all([
        supabase.from('finished_products').select('*').eq('organization_id', organizationId).eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('*').eq('organization_id', organizationId).eq('is_active', true).order('name')
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">The Kitchen 👨‍🍳</h1>
                    <p className="text-muted-foreground">Craft batches and manage production.</p>
                </div>
            </div>

            <KitchenClient
                initialProducts={productsResult.data || []}
                initialMaterials={materialsResult.data || []}
                user={user}
                organizationId={organizationId}
            />
        </div>
    )
}
