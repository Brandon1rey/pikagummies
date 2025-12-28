/**
 * GET /api/bot/recipes/check-stock - Check if a specific product can be produced
 * 
 * Validates stock availability before production and returns detailed info
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({}, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productName = searchParams.get('product_name')
    const quantity = parseInt(searchParams.get('quantity') || '1', 10)
    const orgId = searchParams.get('organization_id')

    if (!orgId || !productName) {
        return NextResponse.json({
            error: 'Missing product_name or organization_id'
        }, { status: 400 })
    }

    try {
        const supabase = createServiceRoleClient()

        // 1. Find the product
        const { data: product } = await (supabase
            .from('finished_products') as any)
            .select(`
                id,
                name,
                recipes (
                    id,
                    qty_required,
                    raw_materials (
                        id,
                        name,
                        current_stock,
                        unit,
                        package_weight,
                        weight_unit
                    )
                )
            `)
            .eq('organization_id', orgId)
            .ilike('name', productName)
            .single()

        if (!product) {
            return NextResponse.json({
                error: `Producto "${productName}" no encontrado`,
                can_produce: false,
                max_producible: 0
            })
        }

        // @ts-ignore - recipes is there
        if (!product.recipes || product.recipes.length === 0) {
            return NextResponse.json({
                error: `El producto "${product.name}" no tiene receta configurada`,
                can_produce: false,
                max_producible: 0
            })
        }

        // 2. Check each ingredient
        const missingIngredients: any[] = []
        const lowStockWarnings: any[] = []
        let maxProducible = Infinity

        // @ts-ignore
        for (const recipe of product.recipes) {
            const material = recipe.raw_materials
            const required = recipe.qty_required * quantity

            // SMART UNIT CONVERSION LOGIC
            // If package_weight is defined, calculate total available in weight units
            let available = material?.current_stock || 0
            let unit = material?.unit

            if (material?.package_weight && material?.package_weight > 0) {
                available = available * material.package_weight
                unit = material.weight_unit || unit // Display unit becomes the weight unit (e.g. 'g')
            }

            const remaining = available - required

            // Calculate max producible based on corrected available amount
            const canMakeWithThis = recipe.qty_required > 0
                ? Math.floor(available / recipe.qty_required)
                : 0

            if (canMakeWithThis < maxProducible) {
                maxProducible = canMakeWithThis
            }

            if (available < required) {
                missingIngredients.push({
                    name: material?.name,
                    unit: unit,
                    required: required,
                    available: available,
                    shortfall: required - available
                })
            } else if (remaining < recipe.qty_required * 5) {
                // Less than 5 production units worth remaining
                lowStockWarnings.push({
                    name: material?.name,
                    unit: unit,
                    remaining: remaining
                })
            }
        }

        const canProduce = missingIngredients.length === 0

        return NextResponse.json({
            product_name: product.name,
            requested_quantity: quantity,
            can_produce: canProduce,
            max_producible: maxProducible === Infinity ? 0 : maxProducible,
            missing_ingredients: missingIngredients,
            low_stock_warnings: lowStockWarnings
        })

    } catch (error: any) {
        console.error('Error checking stock:', error)
        return NextResponse.json({
            error: error.message,
            can_produce: false
        }, { status: 500 })
    }
}
