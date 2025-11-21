'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { FinishedProduct, Recipe, RawMaterial } from "@/lib/types"
import { SpicyCard } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ChefHat, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface KitchenClientProps {
    initialProducts: FinishedProduct[]
}

export function KitchenClient({ initialProducts }: KitchenClientProps) {
    const supabase = createClient()
    const [selectedProductId, setSelectedProductId] = useState<string>("")
    const [batchSize, setBatchSize] = useState<number>(1)
    const [recipe, setRecipe] = useState<(Recipe & { raw_material: RawMaterial })[]>([])
    const [loadingRecipe, setLoadingRecipe] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Derived State
    const selectedProduct = initialProducts.find(p => p.id === selectedProductId)

    // Fetch Recipe when Product Changes
    useEffect(() => {
        if (!selectedProductId) {
            setRecipe([])
            return
        }

        const fetchRecipe = async () => {
            setLoadingRecipe(true)
            const { data, error } = await supabase
                .from('recipes')
                .select('*, raw_material:raw_materials(*)')
                .eq('finished_product_id', selectedProductId)

            if (error) {
                toast.error("Failed to load recipe")
            } else {
                setRecipe(data as any || [])
            }
            setLoadingRecipe(false)
        }

        fetchRecipe()
    }, [selectedProductId, supabase])

    // Calculations
    const totalRevenue = (selectedProduct?.sale_price || 0) * batchSize
    const totalCost = recipe.reduce((acc, item) => {
        return acc + (item.qty_required * batchSize * item.raw_material.average_cost)
    }, 0)
    const netProfit = totalRevenue - totalCost
    const isProfitable = netProfit > 0

    const handleRecordBatch = async () => {
        if (!selectedProduct) return

        // Validate Stock
        const missingIngredients = recipe.filter(item => {
            const required = item.qty_required * batchSize
            return item.raw_material.current_stock < required
        })

        if (missingIngredients.length > 0) {
            toast.error(`Insufficient stock for: ${missingIngredients.map(i => i.raw_material.name).join(", ")}`)
            return
        }

        setSubmitting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const ingredientsPayload = recipe.map(item => ({
                id: item.raw_material_id,
                qty_used: item.qty_required * batchSize
            }))

            const { error } = await supabase.rpc('record_experimental_batch', {
                p_product_id: selectedProduct.id,
                p_qty_produced: batchSize,
                p_ingredients: ingredientsPayload,
                p_user_id: user.id
            })

            if (error) throw error

            toast.success(`Successfully recorded batch of ${batchSize} ${selectedProduct.name}!`)
            setBatchSize(1)
            setSelectedProductId("")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to record batch")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ChefHat className="h-8 w-8 text-orange-500" />
                        Smart Kitchen
                    </h1>
                    <p className="text-zinc-400 mt-1">Record production batches and track costs.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Left Column: Controls */}
                <div className="space-y-6">
                    <SpicyCard>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Select Product</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                        <SelectValue placeholder="Choose a product..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-900 border-white/10 text-white">
                                        {initialProducts.map(product => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-300">Batch Size (Units)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={batchSize}
                                    onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="bg-black/20 border-white/10 text-white text-lg font-mono"
                                />
                            </div>
                        </div>
                    </SpicyCard>

                    {selectedProduct && (
                        <SpicyCard className={cn("border-l-4", isProfitable ? "border-l-green-500" : "border-l-red-500")}>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-orange-500" />
                                    Financial Preview
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-black/20">
                                        <p className="text-xs text-zinc-400">Estimated Revenue</p>
                                        <p className="text-xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-black/20">
                                        <p className="text-xs text-zinc-400">Total Cost</p>
                                        <p className="text-xl font-bold text-red-400">${totalCost.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-zinc-300">Net Profit</span>
                                    <span className={cn("text-2xl font-bold", isProfitable ? "text-green-500" : "text-red-500")}>
                                        ${netProfit.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </SpicyCard>
                    )}
                </div>

                {/* Right Column: Recipe & Action */}
                <div className="space-y-6">
                    {selectedProduct ? (
                        <>
                            <SpicyCard>
                                <h3 className="text-lg font-semibold text-white mb-4">Required Ingredients</h3>
                                {loadingRecipe ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                                    </div>
                                ) : recipe.length > 0 ? (
                                    <div className="space-y-3">
                                        {recipe.map((item) => {
                                            const requiredQty = item.qty_required * batchSize
                                            const hasStock = item.raw_material.current_stock >= requiredQty

                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{item.raw_material.emoji || "📦"}</span>
                                                        <div>
                                                            <p className="text-white font-medium">{item.raw_material.name}</p>
                                                            <p className="text-xs text-zinc-400">
                                                                Cost: ${item.raw_material.average_cost.toFixed(2)}/{item.raw_material.unit}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-mono">
                                                            {requiredQty.toFixed(2)} {item.raw_material.unit}
                                                        </p>
                                                        {!hasStock && (
                                                            <p className="text-xs text-red-500 flex items-center justify-end gap-1">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Low Stock
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 italic text-center p-8">No recipe defined for this product.</p>
                                )}
                            </SpicyCard>

                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-6 text-lg shadow-lg shadow-orange-500/20"
                                onClick={handleRecordBatch}
                                disabled={submitting || loadingRecipe || recipe.length === 0}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Recording Batch...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        Record Production Batch
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-xl">
                            <p className="text-zinc-500 text-center">Select a product to view recipe and calculate costs.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
