import { getSiteUrl } from '@/lib/utils/site-url'

describe('getSiteUrl', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_URL = original })

  it('returns NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.temantumbuh.com'
    expect(getSiteUrl()).toBe('https://app.temantumbuh.com')
  })
  it('strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.temantumbuh.com/'
    expect(getSiteUrl()).toBe('https://app.temantumbuh.com')
  })
})
