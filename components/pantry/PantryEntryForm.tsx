"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/utils/supabase/client"
import { PantryEntrySchema, type PantryEntryFormValues } from "@/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"

export function PantryEntryForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const supabase = createClient()

    const form = useForm<PantryEntryFormValues>({
        resolver: zodResolver(PantryEntrySchema),
        defaultValues: {
            productName: "",
            selectedUnit: "units",
            inputQty: 1,
            totalPrice: 0,
            emoji: "📦",
        },
    })

    async function onSubmit(data: PantryEntryFormValues) {
        setIsSubmitting(true)
        try {
            // Manual Transform Logic (moved from schema)
            let finalQty = data.inputQty
            let finalUnit = data.selectedUnit

            if (data.selectedUnit === 'kg') {
                finalQty = data.inputQty * 1000
                finalUnit = 'g'
            } else if (data.selectedUnit === 'L') {
                finalQty = data.inputQty * 1000
                finalUnit = 'ml'
            }

            const payload = {
                p_name: data.productName,
                p_unit: finalUnit,
                p_qty: finalQty,
                p_total_price: data.totalPrice,
                p_emoji: data.emoji
            }

            const { error } = await supabase.rpc('add_pantry_item', payload)

            if (error) throw error

            toast.success("Item added to pantry!")
            form.reset()
        } catch (error: any) {
            console.error("Error adding item:", error)
            toast.error("Failed to add item: " + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Flour" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="inputQty"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="selectedUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Unit" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="g">Grams (g)</SelectItem>
                                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                        <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                        <SelectItem value="L">Liters (L)</SelectItem>
                                        <SelectItem value="units">Units</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="totalPrice"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Price</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="emoji"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Emoji</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Adding..." : "Add to Pantry"}
                </Button>
            </form>
        </Form>
    )
}
