/**
 * @jest-environment node
 */
import { checkCronAuth } from '@/lib/cron-auth'

const req = (authHeader?: string) =>
  new Request('http://localhost/api/cron', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
  }) as never

describe('checkCronAuth (constant-time cron secret verification)', () => {
  const ORIGINAL = process.env.CRON_SECRET

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL
  })

  it('returns null (authorized) for the correct Bearer token', () => {
    process.env.CRON_SECRET = 'super-secret-value'
    expect(checkCronAuth(req('Bearer super-secret-value'))).toBeNull()
  })

  it('returns 401 for a wrong token', async () => {
    process.env.CRON_SECRET = 'super-secret-value'
    const res = checkCronAuth(req('Bearer wrong'))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('returns 401 for a token of the same length but different bytes', () => {
    process.env.CRON_SECRET = 'abcdef'
    const res = checkCronAuth(req('Bearer ghijkl'))
    expect(res!.status).toBe(401)
  })

  it('returns 401 when the Authorization header is missing', () => {
    process.env.CRON_SECRET = 'super-secret-value'
    expect(checkCronAuth(req())!.status).toBe(401)
  })

  it('returns 401 when the token is present without the Bearer prefix', () => {
    process.env.CRON_SECRET = 'super-secret-value'
    expect(checkCronAuth(req('super-secret-value'))!.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET is not configured', () => {
    delete process.env.CRON_SECRET
    expect(checkCronAuth(req('Bearer anything'))!.status).toBe(500)
  })
})
