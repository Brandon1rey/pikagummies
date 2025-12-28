
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHtmlReport } from '@/lib/report-generator'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales'
    const period = searchParams.get('period') || 'today'

    // 1. Auth & Org Context
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Organization (Assuming single org for now or logic to fetch user's org)
    // For MVP, we fetch the first organization the user belongs to via profile/team
    // Or we rely on client sending org_id? 
    // Secure approach: Fetch user's profile which usually has organization_id
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

    const orgId = profile?.organization_id
    if (!orgId) return NextResponse.json({ error: 'No Organization Found' }, { status: 400 })


    // 2. Date Range Logic
    const now = new Date()
    let startDate = new Date()

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
        startDate.setDate(diff)
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const startIso = startDate.toISOString()


    // 3. Data Fetching & Mapping
    let reportData: any[] = []
    let title = ""
    let columns: string[] = []

    try {
        if (type === 'sales') {
            title = `Reporte de Ventas (${period})`
            columns = ["Producto", "Unidad", "Cantidad", "Monto", "Fecha", "Cliente"]

            const { data, error } = await supabase
                .from('sales')
                .select(`
                    quantity, total_amount, created_at, customer_phone,
                    finished_products ( name, unit )
                `)
                .eq('organization_id', orgId)
                .gte('created_at', startIso)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('SALES_REPORT_ERROR', error)
                throw error
            }
            console.log('SALES_REPORT_DATA_COUNT', data?.length)

            reportData = (data || []).map((s: any) => ({
                "Producto": s.finished_products?.name || '?',
                "Unidad": s.finished_products?.unit || 'pz',
                "Cantidad": s.quantity,
                "Monto": s.total_amount,
                "Fecha": new Date(s.created_at).toLocaleDateString(),
                "Cliente": s.customer_phone || '-'
            }))

        } else if (type === 'expenses') {
            title = `Reporte de Gastos (${period})`
            columns = ["Categoria", "Descripcion", "Monto", "Fecha"]

            const { data } = await supabase
                .from('expenses')
                .select(`category, description, amount, date`)
                .eq('organization_id', orgId)
                .gte('date', startIso)
                .order('date', { ascending: false })

            reportData = (data || []).map((e: any) => ({
                "Categoria": e.category?.toUpperCase(),
                "Descripcion": e.description,
                "Monto": e.amount,
                "Fecha": new Date(e.date).toLocaleDateString()
            }))

        } else if (type === 'products') {
            title = "Inventario de Productos"
            columns = ["Producto", "Unidad", "Stock", "Precio", "Estado"]

            const { data } = await supabase
                .from('finished_products')
                .select('name, unit, current_stock, sale_price, is_active')
                .eq('organization_id', orgId)
                .order('name')

            reportData = (data || []).map((p: any) => ({
                "Producto": p.name,
                "Unidad": p.unit || 'pz',
                "Stock": p.current_stock,
                "Precio": p.sale_price,
                "Estado": p.is_active ? 'Activo' : 'Inactivo'
            }))

        } else if (type === 'materials') {
            title = "Inventario de Materias Primas"
            columns = ["Material", "Unidad", "Stock", "Costo Promedio", "Valor Total"]

            const { data } = await supabase
                .from('raw_materials')
                .select('name, unit, current_stock, average_cost')
                .eq('organization_id', orgId)
                .order('name')

            reportData = (data || []).map((m: any) => ({
                "Material": m.name,
                "Unidad": m.unit || '?',
                "Stock": m.current_stock,
                "Costo Promedio": m.average_cost,
                "Valor Total": (m.current_stock * m.average_cost)
            }))
        }

        // 4. Generate HTML
        const html = generateHtmlReport(reportData, title, columns)

        // 5. Return File
        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="${title.replace(/ /g, '_')}.html"`
            }
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
