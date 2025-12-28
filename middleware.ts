import { type NextRequest, NextResponse } from 'next/server' // <--- AQUÍ FALTABA NextResponse
import { updateSession } from '@/lib/supabase/middleware' // O la ruta que use tu proyecto para auth

export async function middleware(request: NextRequest) {
    // 1. BYPASS (Dejar pasar a WhatsApp sin login)
    if (request.nextUrl.pathname.startsWith('/api/integrations/whatsapp')) {
        return NextResponse.next()
    }

    // 2. Lógica normal de autenticación (Supabase)
    // Si tu proyecto usa updateSession, mantenlo así:
    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}