/**
 * POST /api/bot/pantry/purchase - Registrar compra de materiales
 * With automatic unit conversion to avoid duplicates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { normalizeUnit, calculateStockAddition, unitsAreCompatible } from '@/lib/units'

const purchaseSchema = z.object({
    name: z.string(),
    qty: z.number().positive(),
    total_price: z.number().nonnegative(),
    unit: z.string().default('pz'),
    organization_id: z.string().uuid(),
    // New: Package weight info for unit conversion
    package_weight: z.number().positive().optional(),
    weight_unit: z.enum(['g', 'kg', 'ml', 'lt']).optional()
})

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (token !== process.env.BOT_SERVICE_TOKEN) {
        return NextResponse.json({}, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = purchaseSchema.parse(body)

        // Normalize the name (UPPERCASE to avoid duplicates)
        const normalizedName = payload.name.trim().toUpperCase()
        const normalizedUnit = normalizeUnit(payload.unit)

        const supabase = createServiceRoleClient()

        // 1. Check if material already exists (by normalized name)
        const { data: existingMaterial } = await supabase
            .from('raw_materials')
            .select('id, name, unit, current_stock, average_cost')
            .eq('organization_id', payload.organization_id)
            .eq('name', normalizedName)
            .eq('is_active', true)
            .single()

        if (existingMaterial) {
            // Material exists - update stock with unit conversion
            const existingUnit = normalizeUnit(existingMaterial.unit)
            const existingStock = existingMaterial.current_stock ?? 0
            const existingAvgCost = existingMaterial.average_cost ?? 0

            let qtyToAdd = payload.qty
            let finalUnit = existingUnit
            let conversionNote = ''

            // Try to convert if units differ
            if (existingUnit !== normalizedUnit) {
                if (unitsAreCompatible(existingUnit, normalizedUnit)) {
                    const result = calculateStockAddition(
                        existingStock,
                        existingUnit,
                        payload.qty,
                        normalizedUnit
                    )
                    qtyToAdd = result.newStock - existingStock
                    finalUnit = result.unit
                    conversionNote = ` (Convertido de ${payload.qty} ${normalizedUnit} a ${qtyToAdd.toFixed(4)} ${finalUnit})`
                } else {
                    // Incompatible units - create warning but still add
                    // In this case, we'll add as a new material with different unit
                    return NextResponse.json({
                        error: `Unidades incompatibles. ${normalizedName} existe en ${existingUnit}, pero intentas agregar en ${normalizedUnit}. No se pueden mezclar.`
                    }, { status: 400 })
                }
            }

            // Calculate new average cost
            const oldTotal = existingStock * existingAvgCost
            const newTotal = oldTotal + payload.total_price
            const newStock = existingStock + qtyToAdd
            const newAvgCost = newStock > 0 ? newTotal / newStock : 0

            // Update existing material
            const { error: updateError } = await supabase
                .from('raw_materials')
                .update({
                    current_stock: newStock,
                    average_cost: newAvgCost
                })
                .eq('id', existingMaterial.id)

            if (updateError) throw updateError

            // ✅ RECORD EXPENSE for this purchase
            if (payload.total_price > 0) {
                await supabase.from('expenses').insert({
                    category: 'materiales',
                    amount: payload.total_price,
                    description: `Compra: ${normalizedName} (${payload.qty} ${normalizedUnit})`,
                    date: new Date().toISOString().split('T')[0],
                    created_by: '00000000-0000-0000-0000-000000000002', // Ops Bot
                    organization_id: payload.organization_id
                })
            }

            return NextResponse.json({
                success: true,
                message: `Stock actualizado: ${normalizedName} ahora tiene ${newStock.toFixed(2)} ${finalUnit}${conversionNote}`,
                material_id: existingMaterial.id,
                new_stock: newStock,
                unit: finalUnit,
                converted: conversionNote !== '',
                expense_recorded: payload.total_price > 0
            })

        } else {
            // New material - create it
            const avgCost = payload.qty > 0 ? payload.total_price / payload.qty : 0

            const { data: newMaterial, error: insertError } = await supabase
                .from('raw_materials')
                .insert({
                    name: normalizedName,
                    unit: normalizedUnit,
                    current_stock: payload.qty,
                    average_cost: avgCost,
                    emoji: '📦',
                    is_active: true,
                    organization_id: payload.organization_id,
                    // Store package weight for smart conversion
                    package_weight: payload.package_weight ?? null,
                    weight_unit: payload.weight_unit ?? null
                })
                .select('id')
                .single()

            if (insertError) throw insertError

            // ✅ RECORD EXPENSE for this purchase
            if (payload.total_price > 0) {
                await supabase.from('expenses').insert({
                    category: 'materiales',
                    amount: payload.total_price,
                    description: `Compra: ${normalizedName} (${payload.qty} ${normalizedUnit})`,
                    date: new Date().toISOString().split('T')[0],
                    created_by: '00000000-0000-0000-0000-000000000002', // Ops Bot
                    organization_id: payload.organization_id
                })
            }

            return NextResponse.json({
                success: true,
                message: `Nuevo material creado: ${normalizedName} con ${payload.qty} ${normalizedUnit}`,
                material_id: newMaterial?.id,
                new_stock: payload.qty,
                unit: normalizedUnit,
                is_new: true,
                expense_recorded: payload.total_price > 0
            })
        }

    } catch (error: any) {
        console.error('Error in purchase:', error)
        return NextResponse.json({
            error: error.message || 'Error processing purchase'
        }, { status: 400 })
    }
}
