/**
 * POST /api/bot/recipes/create - Crear o actualizar receta de un producto
 * Used by Ops Bot to create/update product recipes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const ingredientSchema = z.object({
    raw_material_id: z.string().uuid(),
    raw_material_name: z.string().optional(),
    qty_required: z.number().positive(),
    unit: z.string().optional()
})

const recipeSchema = z.object({
    product_id: z.string().uuid(),
    product_name: z.string().optional(),
    ingredients: z.array(ingredientSchema).min(1),
    organization_id: z.string().uuid()
})

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = recipeSchema.parse(body)

        const supabase = createServiceRoleClient()

        // 1. Verify product exists
        const { data: product, error: productError } = await (supabase
            .from('finished_products') as any)
            .select('id, name')
            .eq('id', payload.product_id)
            .eq('organization_id', payload.organization_id)
            .single()

        if (productError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        // 2. Check if recipe already exists (for update detection)
        const { data: existingRecipe } = await supabase
            .from('recipes')
            .select('id')
            .eq('finished_product_id', payload.product_id)
            .eq('organization_id', payload.organization_id)
            .limit(1)

        const isUpdate = existingRecipe && existingRecipe.length > 0

        // 3. Delete existing recipe entries (if updating)
        if (isUpdate) {
            await supabase
                .from('recipes')
                .delete()
                .eq('finished_product_id', payload.product_id)
                .eq('organization_id', payload.organization_id)
        }

        // 4. Insert new recipe entries
        const recipeEntries = payload.ingredients.map(ing => ({
            finished_product_id: payload.product_id,
            raw_material_id: ing.raw_material_id,
            qty_required: ing.qty_required,
            created_by: '00000000-0000-0000-0000-000000000002', // Ops Bot
            organization_id: payload.organization_id
        }))

        const { error: insertError } = await (supabase
            .from('recipes') as any)
            .insert(recipeEntries)

        if (insertError) throw insertError

        return NextResponse.json({
            success: true,
            message: isUpdate ? 'Recipe updated' : 'Recipe created',
            updated: isUpdate,
            product_name: product.name,
            ingredient_count: payload.ingredients.length
        })

    } catch (error: any) {
        console.error('Error creating recipe:', error)
        return NextResponse.json({
            error: error.message || 'Error creating recipe'
        }, { status: 400 })
    }
}
