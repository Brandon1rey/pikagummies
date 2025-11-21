"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Expense } from "@/lib/types"
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, CreditCard, Receipt } from "lucide-react"
import { format } from "date-fns"
import confetti from "canvas-confetti"

interface ExpensesClientProps {
    expenses: (Expense & { created_by_email: string | null })[]
    user: any
}

const EXPENSE_CATEGORIES = [
    "Raw Materials",
    "Utilities",
    "Rent",
    "Salaries",
    "Marketing",
    "Equipment",
    "Maintenance",
    "Other"
]

export function ExpensesClient({ expenses, user }: ExpensesClientProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    // Form State
    const [category, setCategory] = useState("Other")
    const [amount, setAmount] = useState<number | "">("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const handleRecordExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !category) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('expenses')
                .insert({
                    category,
                    amount: Number(amount),
                    description: description || null,
                    date,
                    created_by: user.id
                })

            if (error) throw error

            toast.success(`Expense recorded: $${Number(amount).toFixed(2)}`, {
                description: category
            })

            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#dc2626', '#f87171'] // Red shades
            })

            // Reset form
            setAmount("")
            setDescription("")
            setCategory("Other")
            setDate(new Date().toISOString().split('T')[0])

            // Refresh
            window.location.reload()
        } catch (error: any) {
            console.error("Expense Error:", error)
            console.error("Error Details:", JSON.stringify(error, null, 2))
            toast.error("Failed to record expense", {
                description: error?.message || "Check console"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-500">
            {/* Left Column: New Expense Form */}
            <div className="lg:col-span-2">
                <SpicyCard className="border-red-500/20">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <CreditCard className="h-6 w-6 text-red-500" />
                            The Bills
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <form onSubmit={handleRecordExpense} className="space-y-6">
                            {/* Category Selection */}
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-900 border-white/10 text-white">
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Amount */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Amount ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : "")}
                                        className="h-12 text-lg bg-black/20 border-white/10 text-white"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                {/* Date */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Date</Label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="h-12 bg-black/20 border-white/10 text-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Description (Optional)</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white"
                                    placeholder="What was this for?"
                                />
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-14 text-lg"
                                disabled={loading || !amount}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Receipt className="mr-2 h-5 w-5" />}
                                {loading ? "Saving..." : "Record Expense"}
                            </Button>
                        </form>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Recent Expenses */}
            <div>
                <SpicyCard className="h-full">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="text-red-400">Recent Expenses</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {expenses.length === 0 ? (
                                <div className="text-center text-zinc-500 py-10">No expenses recorded.</div>
                            ) : (
                                expenses.map((exp) => (
                                    <div key={exp.id} className="p-3 bg-black/20 rounded border border-white/5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-white">{exp.category}</p>
                                                {exp.description && (
                                                    <p className="text-sm text-zinc-400 mt-1">{exp.description}</p>
                                                )}
                                                <p className="text-xs text-zinc-600 mt-1">
                                                    {format(new Date(exp.date), 'MMM d, yyyy')} • {exp.created_by_email || 'Unknown'}
                                                </p>
                                            </div>
                                            <p className="text-lg font-bold text-red-400">
                                                -${Number(exp.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            </div>
        </div>
    )
}
