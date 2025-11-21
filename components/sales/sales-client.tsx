"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { FinishedProduct, SaleRecord } from "@/lib/types"
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import { format } from "date-fns"

interface SalesClientProps {
    products: FinishedProduct[]
    recentSales: SaleRecord[]
    user: any
}

export function SalesClient({ products, recentSales, user }: SalesClientProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [productOpen, setProductOpen] = useState(false)

    // Form State
    const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null)
    const [quantity, setQuantity] = useState<number | "">(1)

    // Calculated total
    const totalPrice = selectedProduct && typeof quantity === 'number'
        ? selectedProduct.sale_price * quantity
        : 0

    const handleSale = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct || !quantity) return

        setLoading(true)
        try {
            const { error } = await supabase.rpc('record_manual_sale', {
                p_product_id: selectedProduct.id,
                p_qty: Number(quantity),
                p_payment_method: 'cash', // Default for now
                p_user_id: user.id
            })

            if (error) throw error

            toast.success(`Sale recorded! $${totalPrice.toFixed(2)}`, {
                description: `Sold ${quantity}x ${selectedProduct.name}`
            })

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#10b981', '#059669', '#34d399'] // Green shades
            })

            // Reset form
            setSelectedProduct(null)
            setQuantity(1)

            // Refresh page data
            window.location.reload()
        } catch (error: any) {
            console.error("Sale Error:", error)
            console.error("Error Details:", JSON.stringify(error, null, 2))
            toast.error("Failed to record sale", {
                description: error?.message || "Check console for details"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-500">
            {/* Left Column: New Sale Form */}
            <div className="lg:col-span-2">
                <SpicyCard className="border-green-500/20">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-green-500" />
                            The Cash Register
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <form onSubmit={handleSale} className="space-y-6">
                            {/* Product Selection */}
                            <div className="space-y-2">
                                <Label className="text-zinc-400">What did they buy?</Label>
                                <Popover open={productOpen} onOpenChange={setProductOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={productOpen}
                                            className="w-full justify-between bg-black/20 border-white/10 text-white hover:bg-white/5 hover:text-white h-12 text-lg"
                                        >
                                            {selectedProduct
                                                ? selectedProduct.name
                                                : "Select a product..."}
                                            <ShoppingCart className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 bg-stone-900 border-white/10">
                                        <Command>
                                            <CommandInput placeholder="Search products..." className="text-white" />
                                            <CommandList>
                                                <CommandEmpty>No product found.</CommandEmpty>
                                                <CommandGroup>
                                                    {products.map((product) => (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={product.name}
                                                            onSelect={() => {
                                                                setSelectedProduct(product)
                                                                setProductOpen(false)
                                                            }}
                                                            className="text-white aria-selected:bg-white/10"
                                                        >
                                                            <div className="flex justify-between w-full">
                                                                <span>{product.name}</span>
                                                                <span className="text-green-400">${product.sale_price}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Quantity Input */}
                            <div className="space-y-2">
                                <Label className="text-zinc-400">How many?</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value ? parseInt(e.target.value) : "")}
                                    className="h-12 text-lg bg-black/20 border-white/10 text-white"
                                    placeholder="1"
                                    required
                                />
                            </div>

                            {/* Total Price Display */}
                            {selectedProduct && (
                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-zinc-400">Total Sale</p>
                                            <p className="text-3xl font-bold text-green-400 tabular-nums">
                                                ${totalPrice.toFixed(2)}
                                            </p>
                                        </div>
                                        <TrendingUp className="h-12 w-12 text-green-500 opacity-50" />
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-2">
                                        {quantity} × ${selectedProduct.sale_price} per unit
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg"
                                disabled={loading || !selectedProduct || !quantity}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <DollarSign className="mr-2 h-5 w-5" />}
                                {loading ? "Processing..." : "Confirm Sale"}
                            </Button>
                        </form>
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Recent Sales */}
            <div>
                <SpicyCard className="h-full">
                    <SpicyCardHeader>
                        <SpicyCardTitle className="text-green-400">Recent Sales</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {recentSales.length === 0 ? (
                                <div className="text-center text-zinc-500 py-10">No sales yet.</div>
                            ) : (
                                recentSales.map((sale) => (
                                    <div key={sale.id} className="p-3 bg-black/20 rounded border border-white/5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-white">{sale.product_name}</p>
                                                <p className="text-xs text-zinc-500">
                                                    {sale.quantity}x • {sale.sold_by_email || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-zinc-600 mt-1">
                                                    {format(new Date(sale.created_at), 'MMM d, h:mm a')}
                                                </p>
                                            </div>
                                            <p className="text-lg font-bold text-green-400">
                                                ${Number(sale.total_amount).toFixed(2)}
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
