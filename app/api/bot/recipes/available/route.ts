/**
 * GET /api/bot/recipes/available - List products with recipes and stock availability
 * 
 * Shows all products that have recipes configured with ingredient stock status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({}, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('organization_id')

    if (!orgId) {
        return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 })
    }

    try {
        const supabase = createServiceRoleClient()

        // 1. Get all finished products with their recipes
        const { data: products } = await supabase
            .from('finished_products')
            .select(`
                id,
                name,
                sale_price,
                current_stock,
                recipes (
                    id,
                    qty_required,
                    raw_material_id,
                    raw_materials (
                        id,
                        name,
                        current_stock,
                        unit
                    )
                )
            `)
            .eq('organization_id', orgId)
            .eq('is_active', true)

        if (!products || products.length === 0) {
            return NextResponse.json({ data: [] })
        }

        // 2. Calculate max producible for each product
        const recipesWithStock = products
            .filter((p: any) => p.recipes && p.recipes.length > 0)
            .map((product: any) => {
                const ingredients = product.recipes.map((r: any) => {
                    const material = r.raw_materials
                    const available = material?.current_stock || 0
                    const required = r.qty_required || 0

                    return {
                        name: material?.name || 'Unknown',
                        unit: material?.unit || 'pz',
                        required_per_unit: required,
                        available: available,
                        max_can_make: required > 0 ? Math.floor(available / required) : 0
                    }
                })

                // Max producible is limited by the scarcest ingredient
                const maxProducible = ingredients.length > 0
                    ? Math.min(...ingredients.map((i: any) => i.max_can_make))
                    : 0

                return {
                    product_id: product.id,
                    product_name: product.name,
                    sale_price: product.sale_price,
                    current_stock: product.current_stock,
                    max_producible: maxProducible,
                    ingredients: ingredients
                }
            })

        return NextResponse.json({ data: recipesWithStock })

    } catch (error: any) {
        console.error('Error fetching available recipes:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
