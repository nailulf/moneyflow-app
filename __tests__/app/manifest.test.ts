import manifest from '@/app/manifest'

describe('PWA manifest', () => {
  const m = manifest()
  it('uses the brand theme color', () => { expect(m.theme_color).toBe('#20507F') })
  it('declares a maskable icon', () => {
    expect(m.icons?.some((i) => i.purpose?.includes('maskable'))).toBe(true)
  })
  it('declares an "any"-purpose icon', () => {
    expect(m.icons?.some((i) => i.purpose === 'any' || i.purpose === undefined)).toBe(true)
  })
  it('sets id and scope to root', () => { expect(m.id).toBe('/'); expect(m.scope).toBe('/') })
  it('is a standalone portrait finance app', () => {
    expect(m.display).toBe('standalone')
    expect(m.orientation).toBe('portrait')
    expect(m.categories).toContain('finance')
  })
})
