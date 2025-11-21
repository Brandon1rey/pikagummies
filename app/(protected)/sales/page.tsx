import { createClient } from "@/lib/supabase/server"
import { SalesClient } from "@/components/sales/sales-client"

export default async function SalesPage() {
    const supabase = await createClient()

    const { data: products } = await supabase
        .from('finished_products')
        .select('*')
        .eq('is_active', true)
        .order('name')

    return <SalesClient initialProducts={products || []} />
}
