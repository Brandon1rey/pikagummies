"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Check, ChevronsUpDown, Plus, Trash2, Save, ChefHat } from "lucide-react"
import { cn } from "@/lib/utils"
import { FinishedProduct, RawMaterial, Recipe } from "@/lib/types"

interface RecipeManagerProps {
    products: FinishedProduct[]
    materials: RawMaterial[]
    organizationId: string
}

export function RecipeManager({ products, materials, organizationId }: RecipeManagerProps) {
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null)
    const [ingredients, setIngredients] = useState<{ material: RawMaterial, qty: number }[]>([])
    const [loading, setLoading] = useState(false)
    const [productOpen, setProductOpen] = useState(false)
    const [materialOpen, setMaterialOpen] = useState(false)

    // Load recipe when product is selected
    useEffect(() => {
        if (!selectedProduct) {
            setIngredients([])
            return
        }

        const fetchRecipe = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase.rpc('get_product_recipe', {
                    p_product_id: selectedProduct.id,
                    p_organization_id: organizationId
                })
                if (error) throw error

                // Map RPC result to local state
                const mappedIngredients = data.map((item: any) => {
                    const material = materials.find(m => m.id === item.raw_material_id)
                    if (!material) return null
                    return {
                        material,
                        qty: item.qty_required
                    }
                }).filter(Boolean) as { material: RawMaterial, qty: number }[]

                setIngredients(mappedIngredients)
            } catch (error) {
                console.error(error)
                toast.error("Failed to load recipe")
            } finally {
                setLoading(false)
            }
        }

        fetchRecipe()
    }, [selectedProduct, materials])

    const handleAddIngredient = (material: RawMaterial) => {
        if (ingredients.some(i => i.material.id === material.id)) {
            toast.error("Ingredient already added")
            return
        }
        setIngredients([...ingredients, { material, qty: 0 }])
        setMaterialOpen(false)
    }

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...ingredients]
        newIngredients.splice(index, 1)
        setIngredients(newIngredients)
    }

    const handleQtyChange = (index: number, qty: number) => {
        const newIngredients = [...ingredients]
        newIngredients[index].qty = qty
        setIngredients(newIngredients)
    }

    const handleSave = async () => {
        if (!selectedProduct) return
        setLoading(true)

        try {
            // Construct JSON payload for RPC
            const ingredientsJson = ingredients.map(i => ({
                raw_material_id: i.material.id,
                qty_required: i.qty
            }))

            const { error } = await supabase.rpc('update_product_recipe', {
                p_product_id: selectedProduct.id,
                p_ingredients: ingredientsJson,
                p_organization_id: organizationId
            })

            if (error) throw error

            toast.success("Recipe saved successfully!")
            setOpen(false)
        } catch (error: any) {
            console.error(error)
            toast.error("Failed to save recipe", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-orange-500/20 text-orange-500 hover:bg-orange-500/10">
                    <ChefHat className="mr-2 h-4 w-4" />
                    Manage Recipes
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-stone-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                        Recipe Manager 🧪
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Product Selector */}
                    <div className="space-y-2">
                        <Label>Select Product to Edit</Label>
                        <Popover open={productOpen} onOpenChange={setProductOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={productOpen}
                                    className="w-full justify-between bg-black/20 border-white/10 text-white hover:bg-white/5 hover:text-white"
                                >
                                    {selectedProduct
                                        ? selectedProduct.name
                                        : "Select product..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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

                    {selectedProduct && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Ingredients (Standard Build)</h3>
                                <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                                    <PopoverTrigger asChild>
                                        <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                                            <Plus className="mr-2 h-4 w-4" /> Add Ingredient
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 bg-stone-900 border-white/10">
                                        <Command>
                                            <CommandInput placeholder="Search materials..." className="text-white" />
                                            <CommandList>
                                                <CommandEmpty>No material found.</CommandEmpty>
                                                <CommandGroup>
                                                    {materials.map((material) => (
                                                        <CommandItem
                                                            key={material.id}
                                                            value={material.name}
                                                            onSelect={() => handleAddIngredient(material)}
                                                            className="text-white aria-selected:bg-white/10"
                                                        >
                                                            {material.emoji} {material.name} ({material.unit})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                {ingredients.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500 border border-dashed border-white/10 rounded-lg">
                                        No ingredients defined yet.
                                    </div>
                                ) : (
                                    ingredients.map((item, index) => (
                                        <div key={item.material.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                            <div className="h-8 w-8 flex items-center justify-center bg-white/5 rounded text-xl">
                                                {item.material.emoji}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">{item.material.name}</p>
                                                <p className="text-xs text-zinc-500">Unit: {item.material.unit}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={item.qty || ''}
                                                    onChange={(e) => handleQtyChange(index, parseFloat(e.target.value))}
                                                    className="w-24 bg-black/40 border-white/10 text-right"
                                                    placeholder="0.00"
                                                />
                                                <span className="text-xs text-zinc-500 w-8">{item.material.unit}</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => handleRemoveIngredient(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Recipe</>}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
