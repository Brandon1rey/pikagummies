'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { FinishedProduct } from "@/lib/types"
import { SpicyCard } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { DollarSign, Loader2, ShoppingCart, PartyPopper } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import confetti from "canvas-confetti"

interface SalesClientProps {
    initialProducts: FinishedProduct[]
}

export function SalesClient({ initialProducts }: SalesClientProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState("")
    const [qty, setQty] = useState("1")
    const [paymentMethod, setPaymentMethod] = useState("cash")

    const selectedProduct = initialProducts.find(p => p.id === selectedProductId)
    const total = selectedProduct ? selectedProduct.sale_price * (parseInt(qty) || 0) : 0

    const handleSale = async () => {
        if (!selectedProduct || !qty) return

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const { error } = await supabase.rpc('record_manual_sale', {
                p_product_id: selectedProduct.id,
                p_qty: parseInt(qty),
                p_payment_method: paymentMethod,
                p_user_id: user.id
            })

            if (error) throw error

            // Success!
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
            toast.success(`Sold ${qty}x ${selectedProduct.name}!`)

            // Reset
            setSelectedProductId("")
            setQty("1")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to record sale")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                    <ShoppingCart className="h-8 w-8 text-green-500" />
                    Point of Sale
                </h1>
                <p className="text-zinc-400 mt-1">Record sales and track revenue in real-time.</p>
            </div>

            <SpicyCard>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Select Product</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger className="bg-black/20 border-white/10 text-white h-12 text-lg">
                                <SelectValue placeholder="Choose product..." />
                            </SelectTrigger>
                            <SelectContent className="bg-stone-900 border-white/10 text-white">
                                {initialProducts.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} (${p.sale_price})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                                className="bg-black/20 border-white/10 text-white h-12 text-lg text-center font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="bg-black/20 border-white/10 text-white h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-900 border-white/10 text-white">
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center space-y-2">
                        <span className="text-zinc-400 uppercase tracking-wider text-xs">Total Amount</span>
                        <span className="text-4xl font-bold text-green-400 font-mono">
                            ${total.toFixed(2)}
                        </span>
                    </div>

                    <Button
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-xl shadow-lg shadow-green-500/20"
                        onClick={handleSale}
                        disabled={loading || !selectedProduct}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <DollarSign className="mr-2 h-6 w-6" />
                                Complete Sale
                            </>
                        )}
                    </Button>
                </div>
            </SpicyCard>
        </div>
    )
}
