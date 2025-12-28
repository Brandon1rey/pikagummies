import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) return NextResponse.json({}, { status: 401 })

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')
    const type = searchParams.get('type') || 'hourly' // hourly, daily

    if (!orgId) return NextResponse.json({ error: 'Missing Org ID' }, { status: 400 })

    const supabase = createServiceRoleClient()

    try {
        // Get sales for last 3 months 
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data: salesData, error } = await supabase
            .from('sales')
            .select('created_at, total_amount')
            .eq('organization_id', orgId)
            .gte('created_at', threeMonthsAgo.toISOString())

        if (error) throw error

        if (type === 'hourly') {
            // Group by hour
            const hourlyStats: Record<number, { sales: number; revenue: number }> = {}


                ; (salesData as any[])?.forEach(sale => {
                    if (!sale.created_at) return
                    const hour = new Date(sale.created_at).getHours()
                    if (!hourlyStats[hour]) hourlyStats[hour] = { sales: 0, revenue: 0 }
                    hourlyStats[hour].sales++
                    hourlyStats[hour].revenue += Number(sale.total_amount)
                })

            // Find peak hour
            const hours = Object.entries(hourlyStats)
                .map(([hour, stats]) => ({ hour: parseInt(hour), ...stats }))
                .sort((a, b) => b.sales - a.sales)

            return NextResponse.json({
                type: 'hourly',
                data: hours,
                peak_hour: hours[0]?.hour ?? null
            })

        } else if (type === 'daily') {
            // Group by day of week
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const dailyStats: Record<number, { name: string; sales: number; revenue: number }> = {}

            days.forEach((name, i) => {
                dailyStats[i] = { name, sales: 0, revenue: 0 }
            })


                ; (salesData as any[])?.forEach(sale => {
                    if (!sale.created_at) return
                    const dow = new Date(sale.created_at).getDay()
                    dailyStats[dow].sales++
                    dailyStats[dow].revenue += Number(sale.total_amount)
                })

            const dayData = Object.values(dailyStats).sort((a, b) => b.sales - a.sales)

            return NextResponse.json({
                type: 'daily',
                data: dayData,
                best_day: dayData[0]?.name ?? null
            })
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
