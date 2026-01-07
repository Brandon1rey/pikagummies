/**
 * POST /api/bot/expenses - Registrar un gasto operativo
 * Used by Ops Bot to record operational expenses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { z } from 'zod'

const expenseSchema = z.object({
    category: z.string().default('otros'),
    amount: z.number().positive(),
    description: z.string().optional(),
    organization_id: z.string().uuid()
})

// Valid expense categories (match bot logic)
const VALID_CATEGORIES = [
    'servicios', 'nomina', 'alquiler', 'marketing',
    'transporte', 'mantenimiento', 'impuestos', 'otros'
]

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    // 1. Security Gate
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const payload = expenseSchema.parse(body)

        // Normalize category
        const category = VALID_CATEGORIES.includes(payload.category.toLowerCase())
            ? payload.category.toLowerCase()
            : 'otros'

        const supabase = createServiceRoleClient()

        // Insert expense directly
        const { data, error } = await (supabase.from('expenses') as any)
            .insert({
                category: category,
                amount: payload.amount,
                description: payload.description || `Gasto de ${category}`,
                date: new Date().toISOString().split('T')[0], // Today
                created_by: '00000000-0000-0000-0000-000000000002', // Ops Bot
                organization_id: payload.organization_id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Expense recorded',
            expense_id: data?.id
        })

    } catch (error: any) {
        console.error('Error recording expense:', error)
        return NextResponse.json({
            error: error.message || 'Error recording expense'
        }, { status: 400 })
    }
}
