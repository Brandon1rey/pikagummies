import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const produceSchema = z.object({
    product_name: z.string().min(1),
    quantity: z.number().int().positive(),
    organization_id: z.string().uuid()
})

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    try {
        const body = await request.json()
        const payload = produceSchema.parse(body)

        const supabase = createServiceRoleClient()

        // 1. Check if this organization is a CRAFTING company
        const { data: settings } = await (supabase
            .from('organization_settings' as any)
            .select('module_production')
            .eq('organization_id', payload.organization_id)
            .single())

        if (!(settings as any)?.module_production) {
            return NextResponse.json({
                error: "This company is a Simple Stock business. Manufacturing is not available. Only Crafting companies can produce items."
            }, { status: 403 })
        }

        // 2. Find Product by Name
        const { data: product, error: productError } = await (supabase
            .from('finished_products') as any)
            .select('id, name, current_stock')
            .eq('organization_id', payload.organization_id)
            .ilike('name', payload.product_name)
            .single()

        if (productError || !product) {
            return NextResponse.json({
                error: `Product "${payload.product_name}" not found`
            }, { status: 404 })
        }

        // 3. Get Recipe with Package Weight info using explicit query
        // (Replacing get_product_recipe RPC to get granular raw_material info)
        const { data: productWithRecipe, error: productRecipeError } = await (supabase
            .from('finished_products' as any)
            .select(`
                id,
                name,
                recipes (
                    id,
                    qty_required,
                    raw_material_id,
                    raw_materials (
                        id,
                        name,
                        unit,
                        package_weight,
                        weight_unit
                    )
                )
            `)
            .eq('id', product.id)
            .single()) as { data: any, error: any }

        if (productRecipeError || !productWithRecipe || !productWithRecipe.recipes || productWithRecipe.recipes.length === 0) {
            return NextResponse.json({
                error: `No recipe found for "${product.name}". Please create a recipe first.`
            }, { status: 400 })
        }

        // 4. Calculate total ingredients used (Converting Grams -> Packages if needed)
        const ingredientsToUse = productWithRecipe.recipes.map((item: any) => {
            const material = item.raw_materials
            const totalRequiredGrams = parseFloat(item.qty_required) * payload.quantity

            let qtyToDeduct = totalRequiredGrams

            // SMART CONVERSION: If stock is tracked in Packages but recipe is in Grams
            if (material?.package_weight && material?.package_weight > 0) {
                // Example: Need 100g. Package is 540g. Deduct 0.185 packages.
                qtyToDeduct = totalRequiredGrams / material.package_weight
                console.log(`[PRODUCE] Converting ${material.name}: ${totalRequiredGrams}g -> ${qtyToDeduct.toFixed(4)} pz (Pkg: ${material.package_weight}g)`)
            }

            return {
                id: item.raw_material_id, // Explicit ID from link table
                qty_used: qtyToDeduct
            }
        })

        // 5. Call the experimental batch RPC (New Signature)
        const BOT_USER_ID = '00000000-0000-0000-0000-000000000002' // Ops Bot ID

        const { data: batchResult, error: batchError } = await (supabase.rpc as any)('record_experimental_batch', {
            p_product_id: product.id,
            p_qty_produced: payload.quantity,
            p_ingredients: ingredientsToUse,
            p_user_id: BOT_USER_ID,
            p_organization_id: payload.organization_id
        })

        if (batchError) {
            // Check for common errors
            if (batchError.message?.includes('Not enough')) {
                return NextResponse.json({
                    error: `Not enough ingredients to produce ${payload.quantity}x ${product.name}. Check your pantry!`
                }, { status: 400 })
            }
            throw batchError
        }

        return NextResponse.json({
            success: true,
            product_name: product.name,
            quantity_produced: payload.quantity,
            batch_id: batchResult
        })

    } catch (error: any) {
        console.error("Produce Error:", error)
        return NextResponse.json({ error: error.message || 'Production failed' }, { status: 400 })
    }
}
