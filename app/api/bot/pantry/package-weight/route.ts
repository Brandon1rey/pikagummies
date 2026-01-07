/**
 * POST /api/bot/pantry/package-weight - Update material package weight
 * Called by ops bot for "fix_units" intent.
 * Null-safe: package_weight can be null (retail users don't need this).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const updateSchema = z.object({
    material_name: z.string(),
    package_weight: z.number().positive(),
    weight_unit: z.enum(['g', 'kg', 'ml', 'lt']),
    organization_id: z.string().uuid()
})

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = updateSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Find material by name (exact match, case insensitive)
        const { data: material, error: findError } = await (supabase
            .from('raw_materials') as any)
            .select('id, name')
            .eq('organization_id', payload.organization_id)
            .ilike('name', payload.material_name)
            .eq('is_active', true)
            .single()

        if (findError || !material) {
            return NextResponse.json({
                error: `Material "${payload.material_name}" not found`
            }, { status: 404 })
        }

        // Update package weight
        const { error: updateError } = await (supabase
            .from('raw_materials') as any)
            .update({
                package_weight: payload.package_weight,
                weight_unit: payload.weight_unit
            })
            .eq('id', material.id)

        if (updateError) {
            console.error('[PACKAGE-WEIGHT] Update error:', updateError)
            return NextResponse.json({
                error: updateError.message
            }, { status: 500 })
        }

        console.log(`[PACKAGE-WEIGHT] Updated ${material.name}: ${payload.package_weight}${payload.weight_unit}`)

        return NextResponse.json({
            success: true,
            message: `Package weight updated: ${material.name} = ${payload.package_weight}${payload.weight_unit}`,
            material_id: material.id
        })

    } catch (error: any) {
        console.error('[PACKAGE-WEIGHT] Error:', error)
        return NextResponse.json({
            error: error.message || 'Invalid request'
        }, { status: 400 })
    }
}
