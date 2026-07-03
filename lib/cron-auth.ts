import { createHash, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

/**
 * Constant-time verification of a cron/admin request's
 * `Authorization: Bearer <CRON_SECRET>` header.
 *
 * Returns a NextResponse to send back on failure (500 if CRON_SECRET is unset,
 * 401 if the token is missing/wrong), or `null` when the request is authorized.
 *
 * Both sides are SHA-256'd before comparison so `timingSafeEqual` always receives
 * equal-length buffers (it throws otherwise) and the supplied token's length is
 * never leaked through timing. This replaces the plain `!==` compare, which
 * short-circuits on the first differing byte and is a timing side-channel.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const provided = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`

  const providedHash = createHash('sha256').update(provided).digest()
  const expectedHash = createHash('sha256').update(expected).digest()

  if (!timingSafeEqual(providedHash, expectedHash)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
