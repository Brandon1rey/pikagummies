"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpicyCard, SpicyCardHeader, SpicyCardTitle, SpicyCardContent } from "@/components/ui/spicy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Ingredient {
    id: string;
    name: string;
    base_qty: number;
    scaled_qty: number;
    unit: string;
    cost: number;
}

export default function KitchenPage() {
    const supabase = createClient();
    const [batchSize, setBatchSize] = useState(1);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [products, setProducts] = useState<any[]>([]);
    const [salePrice, setSalePrice] = useState(0);

    // Fetch Products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await supabase.from('finished_products').select('*').eq('is_active', true);
                setProducts(data || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchProducts();
    }, []);

    // Fetch Recipe
    useEffect(() => {
        if (!selectedProduct) return;
        const fetchRecipe = async () => {
            try {
                const { data: product } = await supabase.from('finished_products').select('sale_price').eq('id', selectedProduct).single();
                setSalePrice(product?.sale_price || 0);

                const { data: recipes } = await supabase
                    .from('recipes')
                    .select('*, raw_material:raw_materials(*)')
                    .eq('finished_product_id', selectedProduct);

                const mapped = (recipes || []).map((r: any) => ({
                    id: r.raw_material.id,
                    name: r.raw_material.name,
                    base_qty: r.qty_required,
                    scaled_qty: r.qty_required * batchSize,
                    unit: r.raw_material.unit,
                    cost: r.raw_material.average_cost
                }));
                setIngredients(mapped);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load recipe");
            }
        };
        fetchRecipe();
    }, [selectedProduct, batchSize]); // Added batchSize dependency to re-calculate if needed, though math engine handles it

    // The Math Engine
    useEffect(() => {
        const updated = ingredients.map(i => ({
            ...i,
            scaled_qty: i.base_qty * batchSize
        }));

        // Optimization: Check if changed
        const hasChanged = JSON.stringify(updated) !== JSON.stringify(ingredients);
        if (hasChanged && ingredients.length > 0) {
            setIngredients(updated);
        }
    }, [batchSize]);

    const totalCost = ingredients.reduce((sum, i) => sum + (i.scaled_qty * i.cost), 0);
    const revenue = batchSize * salePrice;

    const handleCook = async () => {
        if (ingredients.length === 0) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                p_product_id: selectedProduct,
                p_qty_produced: batchSize,
                p_ingredients: ingredients.map(i => ({
                    id: i.id,
                    qty_used: i.scaled_qty
                })),
                p_user_id: user?.id
            };

            const { error } = await supabase.rpc('record_experimental_batch', payload);
            if (error) throw error;

            confetti();
            toast.success("Batch recorded!");
        } catch (e: any) {
            console.error(e);
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Smart Kitchen 🍳</h1>
                    <p className="text-muted-foreground">Production line and batch management.</p>
                </div>
                <a
                    href="/kitchen/recipes"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                >
                    Manage Recipes 🧪
                </a>
            </div>

            <SpicyCard>
                <SpicyCardHeader>
                    <SpicyCardTitle>Production Control</SpicyCardTitle>
                </SpicyCardHeader>
                <SpicyCardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Select Product</label>
                        <select
                            className="w-full p-2 bg-stone-800 border border-white/10 rounded text-foreground focus:ring-2 focus:ring-orange-500 outline-none"
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            value={selectedProduct}
                        >
                            <option value="">-- Choose a Product --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Batch Size</label>
                        <Input
                            type="number"
                            value={batchSize}
                            onChange={(e) => setBatchSize(Number(e.target.value))}
                            min={1}
                            className="bg-stone-800 border-white/10"
                        />
                    </div>

                    {selectedProduct && (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="p-3 rounded bg-stone-900 border border-white/5">
                                <div className="text-xs text-muted-foreground">Est. Cost</div>
                                <div className="text-xl font-bold text-red-400">${totalCost.toFixed(2)}</div>
                            </div>
                            <div className="p-3 rounded bg-stone-900 border border-white/5">
                                <div className="text-xs text-muted-foreground">Est. Revenue</div>
                                <div className="text-xl font-bold text-green-400">${revenue.toFixed(2)}</div>
                            </div>
                        </div>
                    )}

                    {revenue > totalCost ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2 rounded text-center font-bold text-sm">
                            Expected Profit: ${(revenue - totalCost).toFixed(2)}
                        </div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded text-center font-bold text-sm">
                            Warning: Loss of ${(totalCost - revenue).toFixed(2)}
                        </div>
                    )}

                    <Button
                        onClick={handleCook}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold shadow-lg shadow-orange-500/20"
                        disabled={!selectedProduct || ingredients.length === 0}
                    >
                        Cook Batch 👨‍🍳
                    </Button>
                </SpicyCardContent>
            </SpicyCard>
        </div>
    );
}
