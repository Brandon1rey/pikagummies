import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExpensesClient } from "@/components/expenses/expenses-client"

export default async function ExpensesPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch recent expenses
    const { data: recentExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, category, amount, description, date, created_at, created_by')
        .order('date', { ascending: false })
        .limit(20)

    if (expensesError) {
        console.error("Expenses fetch error:", expensesError)
    }

    // Fetch creator emails
    const creatorIds = recentExpenses?.map(e => e.created_by).filter(Boolean) || []
    const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', creatorIds)

    // Build lookup map
    const profileMap = new Map(profilesData?.map(p => [p.id, p.email]) || [])

    // Transform the data
    const expenses = recentExpenses?.map(exp => ({
        id: exp.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        date: exp.date,
        created_at: exp.created_at,
        created_by: exp.created_by,
        created_by_email: profileMap.get(exp.created_by || '') || null
    })) || []

    return <ExpensesClient expenses={expenses} user={user} />
}
