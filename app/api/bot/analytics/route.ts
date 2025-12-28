import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')
    const period = searchParams.get('period') || 'today'

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    // 1. Calculate Time Range
    const now = new Date()
    let startDate = new Date()

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
        startDate.setDate(diff)
        startDate.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const startIso = startDate.toISOString()

    try {
        // 2. Parallel Queries (Efficient)
        const [salesRes, expensesRes, expensesBreakdownRes] = await Promise.all([
            // A. Revenue
            supabase
                .from('sales')
                .select('total_amount')
                .eq('organization_id', orgId)
                .gte('created_at', startIso),

            // B. Total Expenses
            supabase
                .from('expenses')
                .select('amount')
                .eq('organization_id', orgId)
                .gte('date', startIso),

            // C. Expense Categories (Top 3)
            supabase
                .from('expenses')
                .select('category, amount')
                .eq('organization_id', orgId)
                .gte('date', startIso)
        ])

        if (salesRes.error) throw salesRes.error
        if (expensesRes.error) throw expensesRes.error

        // 3. Aggregation Logic
        const totalRevenue = (salesRes.data as any[])?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0
        const totalExpenses = (expensesRes.data as any[])?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
        const netCashFlow = totalRevenue - totalExpenses

        // Group Expenses
        const breakdown: Record<string, number> = {}
            ; (expensesBreakdownRes.data as any[])?.forEach(e => {
                breakdown[e.category] = (breakdown[e.category] || 0) + Number(e.amount)
            })

        // Sort Top 3
        const topExpenses = Object.entries(breakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat, amount]) => ({ category: cat, amount }))

        // 4. Return Report
        return NextResponse.json({
            period,
            start_date: startIso,
            revenue: totalRevenue,
            expenses: totalExpenses,
            net_cash_flow: netCashFlow,
            top_expenses: topExpenses
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
