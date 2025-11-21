"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { FinishedProduct, RawMaterial } from "@/lib/types"
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, ChefHat, Flame, Scale, Plus, Trash2, Check, ChevronsUpDown, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { RecipeManager } from "./RecipeManager"
import { Badge } from "@/components/ui/badge"
import confetti from "canvas-confetti"

interface KitchenClientProps {
    initialProducts: FinishedProduct[]
    initialMaterials: RawMaterial[]
    user: any
}

interface IngredientLine {
    material: RawMaterial
    baseQty: number // The amount for 1 unit (from recipe)
    totalQty: number // The scaled amount (baseQty * batchSize)
    isCustom: boolean // If added manually
}

export function KitchenClient({ initialProducts, initialMaterials, user }: KitchenClientProps) {
    const supabase = createClient()

    // State
    const [batchSize, setBatchSize] = useState<number>(0)
    const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null)
    const [ingredients, setIngredients] = useState<IngredientLine[]>([])
    const [loading, setLoading] = useState(false)
    const [cooking, setCooking] = useState(false)

    // UI State
    const [productOpen, setProductOpen] = useState(false)
    const [materialOpen, setMaterialOpen] = useState(false)

    // Create Product State
    const [createProductOpen, setCreateProductOpen] = useState(false)
    const [newProductName, setNewProductName] = useState("")
    const [newProductPrice, setNewProductPrice] = useState("")
    const [creatingProduct, setCreatingProduct] = useState(false)

    // Manage Products State
    const [manageProductsOpen, setManageProductsOpen] = useState(false)
    const [deletingProduct, setDeletingProduct] = useState<string | null>(null)

    // Load Recipe when Product Changes
    useEffect(() => {
        if (!selectedProduct) {
            setIngredients([])
            return
        }

        const loadRecipe = async () => {
            setLoading(true)
            console.log("Loading recipe for:", selectedProduct.name)
            try {
                const { data, error } = await supabase.rpc('get_product_recipe', {
                    p_product_id: selectedProduct.id
                })
                if (error) throw error

                console.log("Recipe data received:", data)

                const recipeLines: IngredientLine[] = data.map((item: any) => {
                    const material = initialMaterials.find(m => m.id === item.raw_material_id)
                    if (!material) return null
                    return {
                        material,
                        baseQty: item.qty_required,
                        totalQty: item.qty_required * (batchSize || 0),
                        isCustom: false
                    }
                }).filter(Boolean)

                setIngredients(recipeLines)
            } catch (error) {
                console.error("Recipe Load Error:", error)
                console.error("Error Details:", JSON.stringify(error, null, 2))
                toast.error("Failed to load recipe")
            } finally {
                setLoading(false)
            }
        }

        loadRecipe()
    }, [selectedProduct, initialMaterials])

    // Reactive Math: Update Total Qty when Batch Size Changes
    useEffect(() => {
        setIngredients(prev => prev.map(line => ({
            ...line,
            totalQty: line.baseQty * (batchSize || 0)
        })))
    }, [batchSize])

    // Financial Calculations
    const financials = useMemo(() => {
        const totalBatchCost = ingredients.reduce((acc, line) => {
            return acc + (line.totalQty * (line.material.average_cost || 0))
        }, 0)

        const unitCost = batchSize > 0 ? totalBatchCost / batchSize : 0
        const estimatedRevenue = batchSize * (selectedProduct?.sale_price || 0)
        const estimatedProfit = estimatedRevenue - totalBatchCost
        const isProfitable = estimatedProfit > 0

        return {
            totalBatchCost,
            unitCost,
            estimatedRevenue,
            estimatedProfit,
            isProfitable
        }
    }, [ingredients, batchSize, selectedProduct])

    // Handlers
    const handleAddCustomIngredient = (material: RawMaterial) => {
        if (ingredients.some(i => i.material.id === material.id)) {
            toast.error("Ingredient already in the pot!")
            return
        }
        // Default to 0 base qty, user must set it
        setIngredients([...ingredients, {
            material,
            baseQty: 0,
            totalQty: 0,
            isCustom: true
        }])
        setMaterialOpen(false)
    }

    const handleUpdateBaseQty = (index: number, newBaseQty: number) => {
        const newIngredients = [...ingredients]
        newIngredients[index].baseQty = newBaseQty
        newIngredients[index].totalQty = newBaseQty * (batchSize || 0)
        setIngredients(newIngredients)
    }

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...ingredients]
        newIngredients.splice(index, 1)
        setIngredients(newIngredients)
    }

    const handleCreateProduct = async () => {
        if (!newProductName || !newProductPrice) return
        setCreatingProduct(true)
        try {
            const { data, error } = await supabase
                .from('finished_products')
                .insert({
                    name: newProductName,
                    sale_price: parseFloat(newProductPrice),
                    current_stock: 0,
                    is_active: true,
                    is_public: true
                })
                .select()
                .single()

            if (error) throw error

            toast.success("Product created!")
            setSelectedProduct(data)
            setCreateProductOpen(false)
            setNewProductName("")
            setNewProductPrice("")
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to create product", { description: error.message })
        } finally {
            setCreatingProduct(false)
        }
    }

    const handleCookBatch = async () => {
        if (!selectedProduct || batchSize <= 0) return
        setCooking(true)

        try {
            // Construct payload with SCALED quantities
            const ingredientsPayload = ingredients.map(line => ({
                id: line.material.id,
                qty_used: line.totalQty
            }))

            const { error } = await supabase.rpc('record_experimental_batch', {
                p_product_id: selectedProduct.id,
                p_qty_produced: batchSize,
                p_ingredients: ingredientsPayload,
                p_user_id: user.id
            })

            if (error) throw error

            toast.success(`Successfully cooked ${batchSize} units of ${selectedProduct.name}!`, {
                description: "Inventory updated and costs recorded."
            })
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#f97316', '#ef4444', '#eab308'] // Orange, Red, Yellow
            })
        } catch (error: any) {
            console.error("Cook Batch Error:", error)
            console.error("Error Details:", JSON.stringify(error, null, 2))
            toast.error("Failed to cook batch", { description: error?.message || "Unknown error. Check console for details." })
        } finally {
            setCooking(false)
        }
    }

    const handleDeleteProduct = async (productId: string) => {
        setDeletingProduct(productId)
        try {
            const { error } = await supabase
                .from('finished_products')
                .delete()
                .eq('id', productId)

            if (error) throw error

            toast.success("Product deleted")
            // If the deleted product was selected, deselect it
            if (selectedProduct?.id === productId) {
                setSelectedProduct(null)
                setIngredients([])
            }
            // We rely on parent re-render or we could update local state if we had it, 
            // but initialProducts comes from props. Ideally we should have a callback or router refresh.
            // For now, let's just close the dialog and maybe refresh the page?
            // Actually, since initialProducts is a prop, we can't easily update it without a router refresh.
            window.location.reload()
        } catch (error: any) {
            console.error("Delete Error:", error)
            console.error("Error Details:", JSON.stringify(error, null, 2))
            toast.error("Failed to delete product", { description: error.message || "Unknown error" })
        } finally {
            setDeletingProduct(null)
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-500">
            {/* Left Column: Controls & Recipe */}
            <div className="lg:col-span-2 space-y-6">
                <SpicyCard className="border-orange-500/20">
                    <SpicyCardHeader className="flex flex-row items-center justify-between">
                        <SpicyCardTitle className="flex items-center gap-2">
                            <ChefHat className="h-6 w-6 text-orange-500" />
                            The Pot
                        </SpicyCardTitle>
                        <div className="flex gap-2">
                            <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                                        <Plus className="mr-2 h-4 w-4" /> New Product
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-stone-950 border-white/10 text-white">
                                    <DialogHeader>
                                        <DialogTitle>Create New Product</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Product Name</Label>
                                            <Input
                                                placeholder="e.g. Super Sour Worms"
                                                value={newProductName}
                                                onChange={(e) => setNewProductName(e.target.value)}
                                                className="bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sale Price ($)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={newProductPrice}
                                                onChange={(e) => setNewProductPrice(e.target.value)}
                                                className="bg-black/20 border-white/10"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleCreateProduct}
                                            disabled={creatingProduct || !newProductName || !newProductPrice}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {creatingProduct ? <Loader2 className="animate-spin" /> : "Create & Select"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={manageProductsOpen} onOpenChange={setManageProductsOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                                        <Trash2 className="mr-2 h-4 w-4" /> Manage Products
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-stone-950 border-white/10 text-white sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Manage Products</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                                        {initialProducts.length === 0 ? (
                                            <p className="text-center text-zinc-500">No products found.</p>
                                        ) : (
                                            initialProducts.map(product => (
                                                <div key={product.id} className="flex items-center justify-between p-3 bg-black/20 rounded border border-white/5">
                                                    <div>
                                                        <p className="font-medium">{product.name}</p>
                                                        <p className="text-xs text-zinc-500">${product.sale_price} / unit</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        disabled={deletingProduct === product.id}
                                                    >
                                                        {deletingProduct === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <RecipeManager products={initialProducts} materials={initialMaterials} />
                        </div>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-6">
                        {/* Product Selection */}
                        <div className="space-y-2">
                            <Label className="text-zinc-400">What are we cooking?</Label>
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
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 bg-stone-900 border-white/10">
                                    <Command>
                                        <CommandInput placeholder="Type to search candy..." className="text-white" />
                                        <CommandList>
                                            <CommandEmpty>No product found.</CommandEmpty>
                                            <CommandGroup>
                                                {initialProducts.map((product) => (
                                                    <CommandItem
                                                        key={product.id}
                                                        value={product.name}
                                                        onSelect={() => {
                                                            setSelectedProduct(product)
                                                            setProductOpen(false)
                                                        }}
                                                        className="text-white aria-selected:bg-white/10"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {product.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Batch Size Input */}
                        <div className="space-y-2">
                            <Label className="text-zinc-400">How many bags/units are we cooking?</Label>
                            <div className="relative">
                                <Flame className="absolute left-3 top-3 h-6 w-6 text-orange-500" />
                                <Input
                                    type="number"
                                    value={batchSize || ''}
                                    onChange={(e) => setBatchSize(parseFloat(e.target.value))}
                                    className="pl-12 h-12 text-lg bg-black/20 border-white/10 text-white"
                                    placeholder="0"
                                />
                            </div>
                            {batchSize > 0 && (
                                <p className="text-xs text-orange-400 font-medium animate-pulse">
                                    Multiplying recipe by {batchSize}x
                                </p>
                            )}
                        </div>

                        {/* Ingredient List (The Crafting Table) */}
                        {selectedProduct ? (
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Ingredients</h3>
                                    <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                                        <PopoverTrigger asChild>
                                            <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                                                <Plus className="mr-2 h-4 w-4" /> Add Extra
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0 bg-stone-900 border-white/10">
                                            <Command>
                                                <CommandInput placeholder="Search materials..." className="text-white" />
                                                <CommandList>
                                                    <CommandEmpty>No material found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {initialMaterials.map((material) => (
                                                            <CommandItem
                                                                key={material.id}
                                                                value={material.name}
                                                                onSelect={() => handleAddCustomIngredient(material)}
                                                                className="text-white aria-selected:bg-white/10"
                                                            >
                                                                {material.emoji} {material.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    {ingredients.map((line, index) => (
                                        <div key={line.material.id} className="bg-black/20 p-4 rounded-lg border border-white/5 transition-all hover:border-white/10">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 flex items-center justify-center bg-white/5 rounded-lg text-2xl">
                                                    {line.material.emoji}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-white">{line.material.name}</p>
                                                            <p className="text-xs text-zinc-500">
                                                                Stock: {Number(line.material.current_stock).toLocaleString()} {line.material.unit}
                                                            </p>
                                                        </div>
                                                        {line.isCustom && <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">Custom</Badge>}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-xs text-zinc-500">Per Bag:</Label>
                                                            <Input
                                                                type="number"
                                                                value={line.baseQty || ''}
                                                                onChange={(e) => handleUpdateBaseQty(index, parseFloat(e.target.value))}
                                                                className="w-20 h-8 text-sm bg-black/40 border-white/10 text-right"
                                                            />
                                                            <span className="text-sm text-zinc-400">{line.material.unit}</span>
                                                        </div>
                                                        <div className="h-px flex-1 bg-white/5 mx-2" />
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-white tabular-nums">
                                                                {line.totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {line.material.unit}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Math Translator */}
                                                    <p className="text-xs text-zinc-500">
                                                        ({line.baseQty} {line.material.unit} per bag × {batchSize || 0} bags = {line.totalQty.toFixed(2)} {line.material.unit} Total)
                                                    </p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => handleRemoveIngredient(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed border-white/5 rounded-lg">
                                <div className="p-4 bg-white/5 rounded-full">
                                    <ChefHat className="h-12 w-12 text-zinc-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-zinc-300">Ready to cook?</h3>
                                    <p className="text-zinc-500">Select a product above to start the fire.</p>
                                </div>
                            </div>
                        )}
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Profit Guard & Actions */}
            <div className="space-y-6">
                <SpicyCard className={cn(
                    "border-2 transition-colors duration-500",
                    financials.isProfitable ? "border-green-500/20" : "border-red-500/20"
                )}>
                    <SpicyCardHeader>
                        <SpicyCardTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5" />
                            Profit Guard
                        </SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-6">
                        <div className="space-y-1">
                            <p className="text-sm text-zinc-400">Total Batch Cost</p>
                            <p className="text-3xl font-bold text-white tabular-nums">
                                ${financials.totalBatchCost.toFixed(2)}
                            </p>
                            <p className="text-xs text-zinc-500">
                                Unit Cost: ${financials.unitCost.toFixed(2)} / bag
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm text-zinc-400">Est. Revenue</p>
                            <p className="text-xl font-semibold text-white tabular-nums">
                                ${financials.estimatedRevenue.toFixed(2)}
                            </p>
                        </div>

                        <div className={cn(
                            "p-4 rounded-lg border flex items-start gap-3",
                            financials.isProfitable
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                            {financials.isProfitable ? (
                                <TrendingUp className="h-5 w-5 shrink-0" />
                            ) : (
                                <TrendingDown className="h-5 w-5 shrink-0" />
                            )}
                            <div>
                                <p className="font-bold">
                                    {financials.isProfitable ? "Projected Profit" : "Projected Loss"}
                                </p>
                                <p className="text-lg font-mono font-bold">
                                    ${Math.abs(financials.estimatedProfit).toFixed(2)}
                                </p>
                                {!financials.isProfitable && (
                                    <p className="text-xs mt-1 text-red-300 font-medium">
                                        🛑 STOP! You are losing money on this batch.
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button
                            className={cn(
                                "w-full h-14 text-lg font-bold shadow-lg transition-all",
                                financials.isProfitable
                                    ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                                    : "bg-stone-800 text-zinc-500 hover:bg-stone-700"
                            )}
                            onClick={handleCookBatch}
                            disabled={cooking || !selectedProduct || batchSize <= 0}
                        >
                            {cooking ? (
                                <Loader2 className="animate-spin mr-2" />
                            ) : (
                                <Flame className="mr-2 h-5 w-5" />
                            )}
                            {cooking ? "Cooking..." : "Cook Batch"}
                        </Button>
                    </SpicyCardContent>
                </SpicyCard>
            </div>
        </div>
    )
}
