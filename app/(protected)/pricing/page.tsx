'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SpicyCard, SpicyCardContent, SpicyCardHeader, SpicyCardTitle } from '@/components/ui/spicy-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Save, Loader2, Tag, DollarSign, Package } from 'lucide-react'

interface Product {
    id: string
    name: string
    current_stock: number
    sale_price: number
    is_active: boolean
}

export default function PricingPage() {
    const supabase = createClient()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) {
                toast.error("No organization found")
                return
            }

            const { data, error } = await supabase
                .from('finished_products')
                .select('id, name, current_stock, sale_price, is_active')
                .eq('organization_id', profile.organization_id)
                .order('name')

            if (error) throw error
            setProducts(data || [])

            // Initialize prices
            const priceMap: Record<string, number> = {}
            data?.forEach(p => {
                priceMap[p.id] = p.sale_price
            })
            setEditedPrices(priceMap)
        } catch (err: any) {
            toast.error("Failed to load products", { description: err.message })
        } finally {
            setLoading(false)
        }
    }

    const handlePriceChange = (productId: string, newPrice: number) => {
        setEditedPrices(prev => ({
            ...prev,
            [productId]: newPrice
        }))
    }

    const handleSave = async (productId: string) => {
        const newPrice = editedPrices[productId]
        if (newPrice === undefined || newPrice < 0) {
            toast.error("Invalid price")
            return
        }

        setSaving(productId)
        try {
            const { error } = await supabase
                .from('finished_products')
                .update({ sale_price: newPrice })
                .eq('id', productId)

            if (error) throw error

            // Update local state
            setProducts(prev =>
                prev.map(p => p.id === productId ? { ...p, sale_price: newPrice } : p)
            )
            toast.success("Price updated!")
        } catch (err: any) {
            toast.error("Failed to update price", { description: err.message })
        } finally {
            setSaving(null)
        }
    }

    // Calculate MARKUP (Merchant Way): ((SalePrice - Cost) / Cost) * 100
    // For Simple Stock, cost comes from the trigger which sets sale_price = cost * 1.3  
    // So original cost = sale_price / 1.3 (at sync time)
    // We compare new edited price to the original base cost
    const calculateMarkup = (product: Product): number => {
        // Original cost is what we synced at (before any edits)
        // The trigger set: sale_price = average_cost * 1.3
        // So: average_cost = original_sale_price / 1.3
        const baseCost = product.sale_price / 1.3
        const newPrice = editedPrices[product.id] || product.sale_price

        // Markup = ((Sale - Cost) / Cost) * 100
        // e.g., $100 item sold for $200 = ((200-100)/100)*100 = 100% markup
        const markup = baseCost > 0 ? ((newPrice - baseCost) / baseCost) * 100 : 0
        return isNaN(markup) || !isFinite(markup) ? 0 : markup
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    <Tag className="h-8 w-8 text-orange-500" />
                    Product Pricing
                </h1>
                <p className="text-zinc-400 mt-1">
                    Set sale prices for your inventory items. Changes take effect immediately.
                </p>
            </div>

            {products.length === 0 ? (
                <SpicyCard>
                    <SpicyCardContent className="text-center py-12">
                        <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">No Products Yet</h3>
                        <p className="text-zinc-400 mt-1">
                            Add items to your stockroom first. They'll appear here automatically.
                        </p>
                    </SpicyCardContent>
                </SpicyCard>
            ) : (
                <SpicyCard>
                    <SpicyCardHeader>
                        <SpicyCardTitle>Set Your Prices</SpicyCardTitle>
                    </SpicyCardHeader>
                    <SpicyCardContent>
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-zinc-400 border-b border-zinc-800 pb-2">
                                <div className="col-span-4">Product</div>
                                <div className="col-span-2 text-center">Stock</div>
                                <div className="col-span-3 text-center">Sale Price</div>
                                <div className="col-span-2 text-center">Markup</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Products */}
                            {products.map(product => {
                                const hasChanged = editedPrices[product.id] !== product.sale_price
                                const markup = calculateMarkup(product)

                                return (
                                    <div
                                        key={product.id}
                                        className={`grid grid-cols-12 gap-4 items-center py-3 border-b border-zinc-800/50 ${!product.is_active ? 'opacity-50' : ''}`}
                                    >
                                        <div className="col-span-4">
                                            <span className="font-medium text-white">{product.name}</span>
                                            {!product.is_active && (
                                                <span className="ml-2 text-xs text-red-400">(Inactive)</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={`${product.current_stock <= 5 ? 'text-red-400' : 'text-zinc-300'}`}>
                                                {product.current_stock}
                                            </span>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="relative">
                                                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editedPrices[product.id] || 0}
                                                    onChange={(e) => handlePriceChange(product.id, parseFloat(e.target.value) || 0)}
                                                    className={`pl-7 bg-zinc-900 border-zinc-700 text-white ${hasChanged ? 'border-orange-500' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={`text-sm ${markup >= 100 ? 'text-green-400' : markup >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {markup.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <Button
                                                size="sm"
                                                variant={hasChanged ? "default" : "ghost"}
                                                onClick={() => handleSave(product.id)}
                                                disabled={saving === product.id || !hasChanged}
                                                className={hasChanged ? 'bg-orange-600 hover:bg-orange-700' : ''}
                                            >
                                                {saving === product.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </SpicyCardContent>
                </SpicyCard>
            )}

            <p className="text-sm text-zinc-500 text-center">
                💡 Tip: Products are auto-synced from your stockroom. Add new items there to see them here.
            </p>
        </div>
    )
}
