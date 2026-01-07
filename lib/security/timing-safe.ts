import { timingSafeEqual } from 'crypto'

/**
 * Validates a token using constant-time comparison to prevent timing attacks.
 * @param provided - The token provided by the client
 * @param expected - The actual secret token
 */
export function validateToken_Safe(provided: string | null, expected: string | undefined): boolean {
    if (!provided || typeof provided !== 'string') return false
    if (!expected || typeof expected !== 'string') return false

    const providedBuf = Buffer.from(provided)
    const expectedBuf = Buffer.from(expected)

    if (providedBuf.length !== expectedBuf.length) {
        return false
    }

    return timingSafeEqual(providedBuf, expectedBuf)
}
