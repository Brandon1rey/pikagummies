import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Get Current User & Org ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <div>Please log in.</div>;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    const orgId = profile?.organization_id;

    if (!orgId) {
        return (
            <div className="flex h-full items-center justify-center text-stone-500">
                No organization found. Please contact support.
            </div>
        );
    }

    try {
        const [
            { data: salesByDow },
            { data: expenseBreakdown },
            { data: salesByHour },
            { data: financials },
            { data: monthlySales },
            { data: quarterlySales },
            { data: topProducts },
            { data: settings },
            { data: orgData }
        ] = await Promise.all([
            supabase.rpc("get_sales_by_dow"), // These RPCs rely on RLS now
            supabase.rpc("get_expense_breakdown"),
            supabase.rpc("get_sales_by_hour"),
            supabase.from("dashboard_financials")
                .select("*")
                .eq("organization_id", orgId), // Explicit Filter
            supabase.rpc("get_monthly_sales"),
            supabase.rpc("get_quarterly_sales"),
            supabase.rpc("get_top_products"),
            supabase.from("organization_settings").select("*").eq("organization_id", orgId).single(),
            createServiceRoleClient().from("organizations").select("name").eq("id", orgId).single() as unknown as Promise<{ data: { name: string } | null, error: any }>
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
                organizationName={orgData?.name || "My Organization"}
                settings={settings}
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
