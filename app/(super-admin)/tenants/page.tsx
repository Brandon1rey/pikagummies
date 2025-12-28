import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { CreateTenantForm } from "@/components/admin/create-tenant-form"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Force fresh data on every request (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// NOTE: This page is protected by the (super-admin)/layout.tsx which checks isSuperAdmin()
// Only users with email in NEXT_PUBLIC_SUPER_ADMIN_EMAIL can access this page

interface OrgMetrics {
    id: string
    name: string
    slug: string
    created_at: string
    teamSize: number
    totalSales: number
    botUserMessages: number  // User messages (DeepSeek API calls)
    botBotMessages: number   // Bot responses
    totalBotMessages: number
}

export default async function SuperAdminPage() {
    // Use regular client for auth check
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Use service role client for data fetching (bypasses RLS)
    const supabase = createServiceRoleClient()

    // Fetch ALL Organizations (service role bypasses RLS)
    const { data: organizations } = await supabase
        .from("organizations" as any)
        .select("*")
        .order("created_at", { ascending: false })

    // Fetch metrics for each org in parallel
    const orgsWithMetrics: OrgMetrics[] = await Promise.all(
        (organizations || []).map(async (org: any) => {
            // Team Size
            const { count: teamSize } = await supabase
                .from("organization_members" as any)
                .select("*", { count: "exact", head: true })
                .eq("organization_id", org.id)

            // Total Sales (count)
            const { count: totalSales } = await supabase
                .from("sales" as any)
                .select("*", { count: "exact", head: true })
                .eq("organization_id", org.id)

            // Bot Messages - User messages (each = 1 DeepSeek API call)
            const { count: botUserMessages } = await supabase
                .from("crm_conversations" as any)
                .select("*", { count: "exact", head: true })
                .eq("organization_id", org.id)
                .eq("sender", "user")

            // Bot Messages - Bot responses
            const { count: botBotMessages } = await supabase
                .from("crm_conversations" as any)
                .select("*", { count: "exact", head: true })
                .eq("organization_id", org.id)
                .eq("sender", "bot")

            return {
                id: org.id,
                name: org.name,
                slug: org.slug,
                created_at: org.created_at,
                teamSize: teamSize || 0,
                totalSales: totalSales || 0,
                botUserMessages: botUserMessages || 0,
                botBotMessages: botBotMessages || 0,
                totalBotMessages: (botUserMessages || 0) + (botBotMessages || 0),
            }
        })
    )

    const totalOrgs = orgsWithMetrics.length
    const totalTeamMembers = orgsWithMetrics.reduce((sum, org) => sum + org.teamSize, 0)
    const totalTransactions = orgsWithMetrics.reduce((sum, org) => sum + org.totalSales, 0)
    const totalApiCalls = orgsWithMetrics.reduce((sum, org) => sum + org.botUserMessages, 0)
    const totalBotMessages = orgsWithMetrics.reduce((sum, org) => sum + org.totalBotMessages, 0)

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">🔒 Super Admin Dashboard</h2>
                    <p className="text-muted-foreground">Platform overview and tenant management</p>
                </div>
                <CreateTenantForm />
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Tenants</CardDescription>
                        <CardTitle className="text-4xl text-purple-400">{totalOrgs}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Users</CardDescription>
                        <CardTitle className="text-4xl text-blue-400">{totalTeamMembers}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Transactions</CardDescription>
                        <CardTitle className="text-4xl text-green-400">{totalTransactions}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription>DeepSeek API Calls</CardDescription>
                        <CardTitle className="text-4xl text-orange-400">{totalApiCalls}</CardTitle>
                        <p className="text-xs text-muted-foreground">User messages = API calls</p>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Bot Messages</CardDescription>
                        <CardTitle className="text-4xl text-pink-400">{totalBotMessages}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Data Grid */}
            <Card>
                <CardHeader>
                    <CardTitle>All Tenants</CardTitle>
                    <CardDescription>
                        Detailed view of all organizations. Bot API Calls = User inbound messages (DeepSeek usage).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="text-center">Team Size</TableHead>
                                <TableHead className="text-center">Total Sales</TableHead>
                                <TableHead className="text-center">API Calls 🤖</TableHead>
                                <TableHead className="text-center">Bot Msgs</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orgsWithMetrics.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell className="font-medium">{org.name}</TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">{org.slug}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            {org.teamSize} 👥
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                                            {org.totalSales} 💰
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                                            {org.botUserMessages} 🧠
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20">
                                            {org.totalBotMessages}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(org.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                            Active
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orgsWithMetrics.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No tenants found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
