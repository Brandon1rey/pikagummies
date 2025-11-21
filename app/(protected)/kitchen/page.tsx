import { createClient } from "@/lib/supabase/server"
import { KitchenClient } from "@/components/kitchen/kitchen-client"
import { redirect } from "next/navigation"

export default async function KitchenPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch initial data for the client component
    const [productsResult, materialsResult] = await Promise.all([
        supabase.from('finished_products').select('*').eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('*').eq('is_active', true).order('name')
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
            />
        </div>
    )
}
