import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

import { validateToken_Safe } from '@/lib/security/timing-safe'

export async function POST(request: NextRequest) {
    const token = request.headers.get('X-Bot-Service-Token')
    if (!validateToken_Safe(token, process.env.BOT_SERVICE_TOKEN)) return NextResponse.json({}, { status: 401 })

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const path = formData.get('path') as string || 'receipts'
        const orgId = formData.get('organization_id') as string

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

        const supabase = createServiceRoleClient()

        // Generate unique path
        const fileExt = file.name.split('.').pop()
        const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const storagePath = `${fileName}`

        // Upload to 'receipts' bucket (Assume it exists or public bucket)
        // If 'receipts' doesn't exist, this will fail. 
        // We could default to 'public' or 'default'.
        const BUCKET = 'receipts'

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: true
            })

        if (error) {
            // Attempt to fallback to 'documents' if receipts fails
            console.warn(`Upload to ${BUCKET} failed, trying 'documents'`, error)
            const { data: data2, error: error2 } = await supabase.storage
                .from('documents')
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: true
                })

            if (error2) throw error2

            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath)
            return NextResponse.json({ url: publicUrl })
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        return NextResponse.json({ url: publicUrl })

    } catch (error: any) {
        console.error("Upload Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
