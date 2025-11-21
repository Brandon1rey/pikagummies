"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Save, Trash2, Beaker, DollarSign } from "lucide-react";
import { Tables } from "@/lib/database.types";
import { useRouter } from "next/navigation";

type Product = Tables<"finished_products">;
type RawMaterial = Tables<"raw_materials">;

interface RecipeIngredient {
    raw_material_id: string;
    qty_required: number;
}

interface RecipeEditorProps {
    initialProducts: Product[];
    rawMaterials: RawMaterial[];
}

export function RecipeEditor({ initialProducts, rawMaterials }: RecipeEditorProps) {
    const supabase = createClient();
    const router = useRouter();

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProductName, setNewProductName] = useState("");
    const [newProductPrice, setNewProductPrice] = useState("");
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [loading, setLoading] = useState(false);

    // Derived state
    const selectedProduct = initialProducts.find(p => p.id === selectedProductId);

    const handleProductSelect = async (productId: string) => {
        if (productId === "new") {
            setIsCreatingNew(true);
            setSelectedProductId(null);
            setIngredients([]);
            return;
        }

        setIsCreatingNew(false);
        setSelectedProductId(productId);
        setLoading(true);

        // Fetch existing recipe
        const { data, error } = await supabase
            .rpc("get_product_recipe", { p_product_id: productId });

        if (error) {
            toast.error("Failed to load recipe");
            console.error(error);
        } else {
            setIngredients(data.map((item: any) => ({
                raw_material_id: item.raw_material_id,
                qty_required: item.qty_required
            })));
        }
        setLoading(false);
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { raw_material_id: "", qty_required: 0 }]);
    };

    const removeIngredient = (index: number) => {
        const newIngredients = [...ingredients];
        newIngredients.splice(index, 1);
        setIngredients(newIngredients);
    };

    const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setIngredients(newIngredients);
    };

    const calculateTotalCost = () => {
        return ingredients.reduce((total, item) => {
            const material = rawMaterials.find(m => m.id === item.raw_material_id);
            return total + (item.qty_required * (material?.average_cost || 0));
        }, 0);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let targetProductId = selectedProductId;

            // 1. Create new product if needed
            if (isCreatingNew) {
                if (!newProductName || !newProductPrice) {
                    toast.error("Please fill in product name and price");
                    setLoading(false);
                    return;
                }

                const { data: newProduct, error: createError } = await supabase
                    .from("finished_products")
                    .insert({
                        name: newProductName,
                        sale_price: parseFloat(newProductPrice),
                        current_stock: 0,
                        is_active: true
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                targetProductId = newProduct.id;
            }

            if (!targetProductId) throw new Error("No product selected");

            // 2. Update Recipe via RPC
            const { error: recipeError } = await supabase
                .rpc("update_product_recipe", {
                    p_product_id: targetProductId,
                    p_ingredients: ingredients
                });

            if (recipeError) throw recipeError;

            toast.success(isCreatingNew ? "Product Created!" : "Recipe Updated!");
            router.refresh();

            if (isCreatingNew) {
                setIsCreatingNew(false);
                setNewProductName("");
                setNewProductPrice("");
                setSelectedProductId(targetProductId);
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to save");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Product Selection */}
            <div className="space-y-6">
                <SpicyCard>
                    <SpicyCardHeader>
                        <SpicyCardTitle>1. Select Product</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-4">
                        <Select onValueChange={handleProductSelect} value={selectedProductId || (isCreatingNew ? "new" : "")}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a product..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new" className="text-orange-500 font-bold">
                                    + Create New Product
                                </SelectItem>
                                {initialProducts.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isCreatingNew && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Product Name</Label>
                                    <Input
                                        placeholder="e.g. Spicy Mango Gummies"
                                        value={newProductName}
                                        onChange={(e) => setNewProductName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sale Price ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={newProductPrice}
                                        onChange={(e) => setNewProductPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedProduct && !isCreatingNew && (
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Price:</span>
                                    <span className="font-mono text-green-400">${selectedProduct.sale_price.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">In Stock:</span>
                                    <span className="font-mono text-blue-400">{selectedProduct.current_stock} units</span>
                                </div>
                            </div>
                        )}
                    </SpicyCardContent>
                </SpicyCard>
            </div>

            {/* Right Column: Recipe Editor */}
            <div className="space-y-6">
                <SpicyCard className={(!selectedProductId && !isCreatingNew) ? "opacity-50 pointer-events-none" : ""}>
                    <SpicyCardHeader className="flex flex-row items-center justify-between">
                        <SpicyCardTitle>2. Define Recipe</SpicyCardTitle>
                        <Button size="sm" variant="outline" onClick={addIngredient}>
                            <Plus className="w-4 h-4 mr-2" /> Add Ingredient
                        </Button>
                    </SpicyCardHeader>
                    <SpicyCardContent className="space-y-4">
                        {ingredients.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No ingredients defined. Add some to start cooking!
                            </div>
                        )}

                        {ingredients.map((ingredient, index) => (
                            <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-xs">Ingredient</Label>
                                    <Select
                                        value={ingredient.raw_material_id}
                                        onValueChange={(val) => updateIngredient(index, "raw_material_id", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawMaterials.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.emoji} {m.name} ({m.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24 space-y-2">
                                    <Label className="text-xs">Qty</Label>
                                    <Input
                                        type="number"
                                        value={ingredient.qty_required}
                                        onChange={(e) => updateIngredient(index, "qty_required", parseFloat(e.target.value))}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    onClick={() => removeIngredient(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-white/10 mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-muted-foreground">Est. Material Cost:</span>
                                <span className="text-xl font-bold text-orange-400">
                                    ${calculateTotalCost().toFixed(2)}
                                </span>
                            </div>

                            <Button
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    "Saving..."
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Save Recipe
                                    </>
                                )}
                            </Button>
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            </div>
        </div>
    );
}
