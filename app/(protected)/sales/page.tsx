import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SalesClient } from "@/components/sales/sales-client"

export default async function SalesPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

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

    // Fetch active products for the dropdown
    const { data: products } = await supabase
        .from('finished_products')
        .select('*')
        .eq('is_active', true)
        .order('name')

    // Fetch recent sales with joined data
    const { data: recentSales, error: salesError } = await supabase
        .from('sales')
        .select('id, quantity, total_amount, created_at, finished_product_id, created_by')
        .order('created_at', { ascending: false })
        .limit(10)

    if (salesError) {
        console.error("Sales fetch error:", salesError)
    }

    // Fetch product names separately
    const productIds = recentSales?.map(s => s.finished_product_id).filter(Boolean) || []
    const { data: productsData } = await supabase
        .from('finished_products')
        .select('id, name')
        .in('id', productIds)

    // Fetch creator emails
    const creatorIds = recentSales?.map(s => s.created_by).filter(Boolean) || []
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', creatorIds)

    // Build lookup maps
    const productMap = new Map(productsData?.map(p => [p.id, p.name]) || [])
    const profileMap = new Map(profilesData?.map(p => [p.id, p.email]) || [])

    // Transform the data for the client
    const salesRecords = recentSales?.map(sale => ({
        id: sale.id,
        product_name: productMap.get(sale.finished_product_id) || 'Unknown',
        quantity: sale.quantity,
        total_amount: sale.total_amount,
        created_at: sale.created_at,
        sold_by_email: profileMap.get(sale.created_by || '') || null
    })) || []

    // Fetch Organization Settings for Receipts
    const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

    return <SalesClient
        products={products || []}
        recentSales={salesRecords}
        user={user}
        organizationId={organizationId}
        orgSettings={orgSettings}
    />
}
