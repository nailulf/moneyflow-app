import { NextResponse } from 'next/server'

/**
 * Swappable rate limiter.
 *
 * Backend is chosen at runtime:
 *  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set → Upstash Redis
 *    (distributed, exact across every serverless instance). Talks to Upstash's REST
 *    API via fetch, so there is NO npm dependency to install — set the two env vars
 *    and it activates.
 *  - Otherwise → in-memory (per-instance Map). Ships with zero infra, but on Vercel
 *    each function instance has its own memory, so the effective limit is fuzzy
 *    (up to `limit` × number-of-warm-instances) and resets when an instance is
 *    recycled. Good enough to stop naive/accidental hammering; upgrade to Upstash
 *    for an exact, durable limit.
 *
 * Both backends use a fixed-window counter. The window is `windowMs` long and resets
 * as a whole (not sliding) — simple and predictable.
 *
 * Design choice: the limiter FAILS OPEN. If the backend errors (e.g. Upstash network
 * blip), the request is allowed and the error is logged, so the limiter can never
 * take the app down by itself.
 */

export interface RateLimitConfig {
  /** Max requests allowed within the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  /** Requests remaining in the current window (never negative). */
  remaining: number
  /** Epoch ms when the current window resets. */
  reset: number
}

/** Named presets so call sites stay consistent and limits are tuned in one place. */
export const RATE_LIMITS = {
  /** AI/OpenAI-backed routes — cost-sensitive, keyed by user. */
  ai: { limit: 15, windowMs: 60_000 },
  /** Authenticated write routes (create/update/delete), keyed by user. */
  mutation: { limit: 60, windowMs: 60_000 },
  /** Credential-setting / user-creating routes, keyed by IP (tighter). */
  authSensitive: { limit: 8, windowMs: 60_000 },
  /** Public analytics proxies, keyed by IP — generous (telemetry is chatty), just caps floods. */
  analytics: { limit: 300, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface Bucket {
  count: number
  reset: number
}

// Module-level store persists across requests handled by the same instance.
const memoryStore = new Map<string, Bucket>()
// Hard cap so a flood of unique keys can't grow the map without bound.
const MEMORY_MAX_KEYS = 10_000

function pruneExpired(now: number): void {
  for (const [key, bucket] of memoryStore) {
    if (bucket.reset <= now) memoryStore.delete(key)
  }
}

function memoryLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  let bucket = memoryStore.get(key)

  if (!bucket || bucket.reset <= now) {
    // Opportunistic cleanup when we happen to roll a new window.
    if (memoryStore.size > MEMORY_MAX_KEYS) pruneExpired(now)
    bucket = { count: 0, reset: now + config.windowMs }
    memoryStore.set(key, bucket)
  }

  bucket.count++
  const success = bucket.count <= config.limit
  return {
    success,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    reset: bucket.reset,
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis backend (REST API — no SDK dependency)
// ---------------------------------------------------------------------------

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

async function upstashLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const redisKey = `ratelimit:${key}`

  // Pipeline: INCR the counter, set the TTL only on first hit (PEXPIRE ... NX),
  // then read the remaining TTL so we can report an accurate reset time.
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['PEXPIRE', redisKey, String(config.windowMs), 'NX'],
      ['PTTL', redisKey],
    ]),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Upstash error ${res.status}`)
  }

  const data = (await res.json()) as Array<{ result?: number; error?: string }>
  const count = Number(data[0]?.result ?? 0)
  let ttl = Number(data[2]?.result ?? config.windowMs)
  // PTTL returns -1 (no expire) / -2 (no key) in edge cases — fall back to the window.
  if (ttl < 0) ttl = config.windowMs

  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    reset: Date.now() + ttl,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check (and consume) one unit against the limit for `key`.
 * Returns a result describing whether the request is allowed.
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (upstashConfigured()) {
    try {
      return await upstashLimit(key, config)
    } catch (err) {
      // Fail open: never let a limiter outage break the app.
      console.error('[rate-limit] Upstash backend failed, allowing request:', err)
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit,
        reset: Date.now() + config.windowMs,
      }
    }
  }
  return memoryLimit(key, config)
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Standard rate-limit headers for any response. */
function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  }
}

/** Build the 429 response for a blocked request, including Retry-After. */
export function tooManyRequestsResponse(result: RateLimitResult): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

/**
 * One-call guard for route handlers.
 *
 *   const limited = await enforceRateLimit(`ai:${user.id}`, RATE_LIMITS.ai)
 *   if (limited) return limited   // 429 already built
 *
 * Returns a ready-to-return 429 NextResponse when the caller is over the limit,
 * or null when the request may proceed.
 */
export async function enforceRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await rateLimit(key, config)
  return result.success ? null : tooManyRequestsResponse(result)
}
