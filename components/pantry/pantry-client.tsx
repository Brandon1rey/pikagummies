"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { RawMaterial } from "@/lib/types"
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ShoppingBasket, Calculator, Package, DollarSign, Tag, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import confetti from "canvas-confetti"

interface PantryClientProps {
    initialStock: RawMaterial[]
    user: any
    organizationId: string
}

export function PantryClient({ initialStock, user, organizationId }: PantryClientProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [unit, setUnit] = useState("kg")
    const [qty, setQty] = useState<number | "">("")
    const [totalPrice, setTotalPrice] = useState<number | "">("")
    const [emoji, setEmoji] = useState("📦")

    // Math Preview
    const unitCost = (typeof qty === 'number' && typeof totalPrice === 'number' && qty > 0)
        ? totalPrice / qty
        : 0

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !qty || !totalPrice) return

        setLoading(true)
        try {
            const { error } = await supabase.rpc('purchase_new_material', {
                p_name: name,
                p_unit: unit,
                p_qty: Number(qty),
                p_total_price: Number(totalPrice),
                p_emoji: emoji,
                p_user_id: user.id,
                p_organization_id: organizationId
            })

            if (error) throw error

            toast.success("Purchase recorded!", {
                description: `Added ${qty}${unit} of ${name} to inventory.`
            })
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            // Reset Form
            setName("")
            setQty("")
            setTotalPrice("")
            setEmoji("📦")
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to record purchase", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return

        try {
            const { error } = await supabase
                .from('raw_materials')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Item deleted")
            window.location.reload()
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to delete item", { description: error.message })
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-500">
            {/* Left Column: The Dumb-Proof Form */}
            <div className="lg:col-span-2">
                <SpicyCard>
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <ShoppingBasket className="h-6 w-6 text-emerald-500" />
                            Record New Purchase
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <form onSubmit={handlePurchase} className="space-y-6">
                            {/* Question 1: Name */}
                            <div className="space-y-2">
                                <Label className="text-zinc-300">1. What is it called?</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                    <Input
                                        placeholder="e.g. Sugar, Corn Syrup, Magic Dust"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 bg-black/20 border-white/10 text-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Question 2: Unit */}
                            <div className="space-y-2">
                                <Label className="text-zinc-300">2. Is it in kg, g, L, or units?</Label>
                                <Select value={unit} onValueChange={setUnit}>
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-900 border-white/10 text-white">
                                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                        <SelectItem value="g">Grams (g)</SelectItem>
                                        <SelectItem value="L">Liters (L)</SelectItem>
                                        <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                        <SelectItem value="units">Units/Pieces</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Question 3: Quantity */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">3. How much does it weigh?</Label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Total Qty"
                                            value={qty}
                                            onChange={(e) => setQty(e.target.value ? parseFloat(e.target.value) : "")}
                                            className="pl-10 bg-black/20 border-white/10 text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Question 4: Total Price */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">4. Total Receipt Price?</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Total $"
                                            value={totalPrice}
                                            onChange={(e) => setTotalPrice(e.target.value ? parseFloat(e.target.value) : "")}
                                            className="pl-10 bg-black/20 border-white/10 text-white"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Math Preview Card */}
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-full">
                                    <Calculator className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-400">System Calculation</p>
                                    <p className="text-lg font-medium text-white">
                                        Recording at <span className="text-emerald-400 font-bold">${unitCost.toFixed(2)} per {unit}</span>
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Record Purchase"}
                            </Button>
                        </form>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Current Inventory */}
            <div>
                <SpicyCard className="h-full">
                    <SpicyCardHeader>
                        <SpicyCardTitle>Current Stock</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {initialStock.length === 0 ? (
                                <div className="text-center text-zinc-500 py-10">Pantry is empty.</div>
                            ) : (
                                initialStock.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{item.emoji}</span>
                                            <div>
                                                <p className="font-medium text-white">{item.name}</p>
                                                <p className="text-xs text-zinc-500">${Number(item.average_cost).toFixed(2)} / {item.unit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
                                                {Number(item.current_stock).toLocaleString()} {item.unit}
                                            </Badge>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
