import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const supabase = await createClient();

    try {
        const [
            { data: salesByDow },
            { data: expenseBreakdown },
            { data: salesByHour },
            { data: financials },
            { data: monthlySales },
            { data: quarterlySales },
            { data: topProducts }
        ] = await Promise.all([
            supabase.rpc("get_sales_by_dow"),
            supabase.rpc("get_expense_breakdown"),
            supabase.rpc("get_sales_by_hour"),
            supabase.from("dashboard_financials").select("*"),
            supabase.rpc("get_monthly_sales"),
            supabase.rpc("get_quarterly_sales"),
            supabase.rpc("get_top_products")
        ]);

        return (
            <DashboardClient
                salesByDow={salesByDow || []}
                expenseBreakdown={expenseBreakdown || []}
                salesByHour={salesByHour || []}
                financials={financials || []}
                monthlySales={monthlySales || []}
                quarterlySales={quarterlySales || []}
                topProducts={topProducts || []}
            />
        );
    } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
        return (
            <div className="flex h-full items-center justify-center text-stone-500">
                Error loading dashboard data.
            </div>
        );
    }
}
