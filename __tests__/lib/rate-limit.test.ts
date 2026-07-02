/**
 * @jest-environment node
 */
import {
  rateLimit,
  enforceRateLimit,
  getClientIp,
  tooManyRequestsResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

describe('rate-limit (in-memory backend)', () => {
  beforeEach(() => {
    // Force the in-memory backend (Upstash disabled).
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('allows requests up to the limit, then blocks', async () => {
    const cfg = { limit: 3, windowMs: 60_000 }
    const key = 'test:allow-block'
    const results = []
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, cfg))

    expect(results.map((r) => r.success)).toEqual([true, true, true, false])
    expect(results[0].remaining).toBe(2)
    expect(results[2].remaining).toBe(0)
    expect(results[3].remaining).toBe(0)
  })

  it('tracks keys independently', async () => {
    const cfg = { limit: 1, windowMs: 60_000 }
    expect((await rateLimit('test:k1', cfg)).success).toBe(true)
    expect((await rateLimit('test:k2', cfg)).success).toBe(true)
    expect((await rateLimit('test:k1', cfg)).success).toBe(false)
  })

  it('resets after the window elapses', async () => {
    jest.useFakeTimers()
    try {
      jest.setSystemTime(0)
      const cfg = { limit: 1, windowMs: 1000 }
      const key = 'test:reset'

      expect((await rateLimit(key, cfg)).success).toBe(true)
      expect((await rateLimit(key, cfg)).success).toBe(false)

      jest.advanceTimersByTime(1001)
      expect((await rateLimit(key, cfg)).success).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  it('enforceRateLimit returns null under the limit and a 429 over it', async () => {
    const cfg = { limit: 1, windowMs: 60_000 }
    const key = 'test:enforce'

    expect(await enforceRateLimit(key, cfg)).toBeNull()

    const blocked = await enforceRateLimit(key, cfg)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).toBeTruthy()
    expect(blocked!.headers.get('X-RateLimit-Limit')).toBe('1')
  })

  it('builds a 429 response with rate-limit headers', () => {
    const res = tooManyRequestsResponse({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30_000,
    })
    expect(res.status).toBe(429)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('getClientIp reads the first x-forwarded-for hop', () => {
    const req = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('getClientIp falls back to x-real-ip, then "unknown"', () => {
    const withReal = new Request('https://example.test', {
      headers: { 'x-real-ip': '9.9.9.9' },
    })
    expect(getClientIp(withReal)).toBe('9.9.9.9')
    expect(getClientIp(new Request('https://example.test'))).toBe('unknown')
  })

  it('exposes sane presets', () => {
    for (const cfg of Object.values(RATE_LIMITS)) {
      expect(cfg.limit).toBeGreaterThan(0)
      expect(cfg.windowMs).toBeGreaterThan(0)
    }
  })
})
