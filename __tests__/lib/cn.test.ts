import { cn } from '@/lib/utils'

describe('cn — custom utility groups survive tailwind-merge', () => {
  it('keeps custom font sizes alongside text colors', () => {
    expect(cn('text-nano font-medium', 'text-primary-foreground')).toBe(
      'text-nano font-medium text-primary-foreground'
    )
    expect(cn('text-tiny', 'text-tint-purple-fg')).toBe('text-tiny text-tint-purple-fg')
  })
  it('still resolves real font-size conflicts (last wins)', () => {
    expect(cn('text-nano', 'text-tiny')).toBe('text-tiny')
    expect(cn('text-sm', 'text-nano')).toBe('text-nano')
  })
  it('keeps bg-hero-gradient alongside bg colors', () => {
    expect(cn('bg-hero-gradient', 'text-hero-foreground')).toBe('bg-hero-gradient text-hero-foreground')
  })
})
