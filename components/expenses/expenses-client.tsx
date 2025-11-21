'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SpicyCard } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CreditCard, Loader2, Plus } from "lucide-react"
import confetti from "canvas-confetti"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const CATEGORIES = [
    "Utilities",
    "Rent",
    "Marketing",
    "Equipment",
    "Maintenance",
    "Other"
]

export function ExpensesClient() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState("Other")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!description || !amount) {
            toast.error("Please fill in all fields")
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const { error } = await supabase
                .from('expenses')
                .insert({
                    description,
                    amount: parseFloat(amount),
                    category,
                    created_by: user.id,
                    date: new Date().toISOString()
                })

            if (error) throw error

            if (error) throw error

            confetti()
            toast.success("Expense recorded successfully")
            setDescription("")
            setAmount("")
            setCategory("Other")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to record expense")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                    <CreditCard className="h-8 w-8 text-red-500" />
                    Expense Tracker
                </h1>
                <p className="text-zinc-400 mt-1">Log operational expenses (OpEx).</p>
            </div>

            <SpicyCard>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Description</Label>
                        <Input
                            placeholder="What was this for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-black/20 border-white/10 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Amount</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-black/20 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-900 border-white/10 text-white">
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-5 w-5" />
                                Record Expense
                            </>
                        )}
                    </Button>
                </form>
            </SpicyCard>
        </div>
    )
}
