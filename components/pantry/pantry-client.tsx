"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from "@/components/ui/spicy-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, ShoppingCart, Trash2, Archive, AlertTriangle } from "lucide-react";
import { Tables } from "@/lib/database.types";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type RawMaterial = Tables<"raw_materials">;

interface PantryClientProps {
    initialStock: RawMaterial[];
}

export function PantryClient({ initialStock }: PantryClientProps) {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Purchase Form State
    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [unit, setUnit] = useState("kg");
    const [totalPrice, setTotalPrice] = useState("");
    const [emoji, setEmoji] = useState("📦");

    // Derived State
    const unitCost = (parseFloat(totalPrice) && parseFloat(qty))
        ? (parseFloat(totalPrice) / parseFloat(qty)).toFixed(2)
        : "0.00";

    const handlePurchase = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.rpc("purchase_new_material", {
                p_name: name,
                p_unit: unit,
                p_qty: parseFloat(qty),
                p_total_price: parseFloat(totalPrice),
                p_emoji: emoji,
                p_user_id: user.id
            });

            if (error) throw error;

            toast.success("Purchase Recorded!", {
                description: `Added ${qty}${unit} of ${name} to inventory.`
            });

            // Reset Form
            setName("");
            setQty("");
            setTotalPrice("");
            setEmoji("📦");
            router.refresh();

        } catch (error: any) {
            console.error(error);
            toast.error("Purchase Failed", {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSmartDelete = async (id: string, name: string) => {
        try {
            const { data, error } = await supabase.rpc("smart_delete_item", {
                target_id: id,
                table_name: "raw"
            });

            if (error) throw error;

            if (data === "PERMANENTLY_DELETED") {
                toast.success(`${name} Deleted`, {
                    description: "Item had no usage history and was removed permanently."
                });
            } else {
                toast.info(`${name} Archived`, {
                    description: "Item has usage history, so it was archived instead of deleted."
                });
            }
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error("Delete Failed", { description: error.message });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Inventory Management 📦</h1>
                <p className="text-muted-foreground">Track stock, record purchases, and manage raw materials.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column: Purchase Form */}
                <div className="lg:col-span-1">
                    <SpicyCard className="sticky top-6">
                        <SpicyCardHeader>
                            <SpicyCardTitle className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-orange-500" />
                                Record Purchase
                            </SpicyCardTitle>
                        </SpicyCardHeader>
                        <SpicyCardContent>
                            <form onSubmit={handlePurchase} className="space-y-4">
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-1 space-y-2">
                                        <Label>Icon</Label>
                                        <Input
                                            value={emoji}
                                            onChange={(e) => setEmoji(e.target.value)}
                                            className="text-center text-2xl"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-2">
                                        <Label>Item Name</Label>
                                        <Input
                                            placeholder="e.g. Sugar"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={qty}
                                            onChange={(e) => setQty(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit</Label>
                                        <Input
                                            placeholder="kg, L, pcs"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Total Price ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={totalPrice}
                                        onChange={(e) => setTotalPrice(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Est. Unit Cost:</span>
                                    <span className="font-mono font-bold text-green-400">${unitCost} / {unit || 'unit'}</span>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
                                    disabled={loading}
                                >
                                    {loading ? "Processing..." : "Add to Inventory"}
                                </Button>
                            </form>
                        </SpicyCardContent>
                    </SpicyCard>
                </div>

                {/* Right Column: Stock Grid */}
                <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start">
                    {initialStock.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            <p>Pantry is empty. Go shopping! 🛒</p>
                        </div>
                    ) : (
                        initialStock.map((item) => (
                            <SpicyCard key={item.id} className="group relative overflow-hidden transition-all hover:scale-[1.02]">
                                <SpicyCardContent className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-4xl">{item.emoji}</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-bold text-foreground">
                                                {item.current_stock}
                                                <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ${item.average_cost?.toFixed(2)} / {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg truncate pr-8">{item.name}</h3>

                                    {/* Smart Delete Action */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-stone-900 border border-white/10 text-foreground">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        If this item has been used in batches, it will be <strong>archived</strong> to preserve history.
                                                        Otherwise, it will be <strong>permanently deleted</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="border-white/10 hover:bg-white/5 hover:text-foreground">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleSmartDelete(item.id, item.name)}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        Confirm
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </SpicyCardContent>
                                {/* Low Stock Indicator */}
                                {item.current_stock !== null && item.current_stock < 10 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/50" />
                                )}
                            </SpicyCard>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
