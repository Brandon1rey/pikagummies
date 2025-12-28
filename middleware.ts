import { type NextRequest, NextResponse } from 'next/server' // <--- AQUÍ FALTABA NextResponse
import { updateSession } from '@/lib/supabase/middleware' // O la ruta que use tu proyecto para auth

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Simple in-memory fallback if Redis is not configured (prevents crash, but doesn't limit effectively across lambdas)
// In production, YOU MUST SET UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
const redis = process.env.UPSTASH_REDIS_REST_URL
    ? Redis.fromEnv()
    : null;

const ratelimit = redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
        analytics: true,
    })
    : null;

export async function middleware(request: NextRequest) {
    // 0. RATE LIMITING (Bot Protection)
    if (request.nextUrl.pathname.startsWith('/api/bot')) {
        if (ratelimit) {
            const ip = (request as any).ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
            const { success } = await ratelimit.limit(ip);
            if (!success) {
                return new NextResponse('Too Many Requests', { status: 429 });
            }
        }
    }

    // 1. BYPASS (Dejar pasar a WhatsApp sin login)
    if (request.nextUrl.pathname.startsWith('/api/integrations/whatsapp')) {
        return NextResponse.next()
    }

    // 2. Lógica normal de autenticación (Supabase)
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