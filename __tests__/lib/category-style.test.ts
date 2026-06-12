import {
  Utensils, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  GraduationCap, Plane, Briefcase, ArrowLeftRight, PiggyBank, CreditCard, Coffee, Tag,
  TrendingUp,
} from 'lucide-react'
import { getCategoryIcon, getCategoryTint, CATEGORY_TINTS } from '@/lib/category-style'

describe('getCategoryIcon', () => {
  it.each([
    ['Food & Dining', Utensils],
    ['Transportation', Car],
    ['Shopping', ShoppingBag],
    ['Entertainment', Clapperboard],
    ['Bills & Utilities', Receipt],
    ['Healthcare', HeartPulse],
    ['Education', GraduationCap],
    ['Travel', Plane],
    ['Income', Briefcase],
    ['Investment', TrendingUp],
    ['Transfer', ArrowLeftRight],
    ['Savings transfer', PiggyBank],
    ['Credit card payment', CreditCard],
  ])('maps seeded category %s', (name, icon) => {
    expect(getCategoryIcon(name)).toBe(icon)
  })

  it('matches case-insensitively and on substrings', () => {
    expect(getCategoryIcon('monthly FOOD budget')).toBe(Utensils)
    expect(getCategoryIcon('Kopi & coffee')).toBe(Coffee)
  })

  it('maps Indonesian category names', () => {
    expect(getCategoryIcon('Makanan')).toBe(Utensils)
    expect(getCategoryIcon('Transportasi')).toBe(Car)
    expect(getCategoryIcon('Belanja')).toBe(ShoppingBag)
    expect(getCategoryIcon('Tagihan')).toBe(Receipt)
    expect(getCategoryIcon('Kesehatan')).toBe(HeartPulse)
    expect(getCategoryIcon('Pendidikan')).toBe(GraduationCap)
    expect(getCategoryIcon('Gaji')).toBe(Briefcase)
    expect(getCategoryIcon('Investasi')).toBe(TrendingUp)
    expect(getCategoryIcon('Tabungan')).toBe(PiggyBank)
  })

  it('falls back to Tag for unknown, empty, and nullish names', () => {
    expect(getCategoryIcon('Zzz Unknown')).toBe(Tag)
    expect(getCategoryIcon('')).toBe(Tag)
    expect(getCategoryIcon(null)).toBe(Tag)
    expect(getCategoryIcon(undefined)).toBe(Tag)
  })

  it('applies rule order, not name order, on multi-keyword names', () => {
    expect(getCategoryIcon('Makan & Hiburan')).toBe(Utensils)
  })
})

describe('getCategoryTint', () => {
  it('maps seeded categories to their design tints', () => {
    expect(getCategoryTint('Food & Dining')).toEqual({ bg: 'bg-tint-amber-bg', fg: 'text-tint-amber-fg' })
    expect(getCategoryTint('Transportation')).toEqual({ bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' })
    expect(getCategoryTint('Shopping')).toEqual({ bg: 'bg-tint-pink-bg', fg: 'text-tint-pink-fg' })
    expect(getCategoryTint('Entertainment')).toEqual({ bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' })
    expect(getCategoryTint('Bills & Utilities')).toEqual({ bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' })
    expect(getCategoryTint('Healthcare')).toEqual({ bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' })
    expect(getCategoryTint('Travel')).toEqual({ bg: 'bg-tint-teal-bg', fg: 'text-tint-teal-fg' })
    expect(getCategoryTint('Income')).toEqual({ bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' })
    expect(getCategoryTint('Investment')).toEqual({ bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' })
  })

  it('is deterministic for unknown names', () => {
    const a = getCategoryTint('My Custom Hobby')
    const b = getCategoryTint('My Custom Hobby')
    expect(a).toEqual(b)
    expect(CATEGORY_TINTS).toContainEqual(a)
  })

  it('spreads unknown names across multiple tints', () => {
    const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
    const distinct = new Set(names.map((n) => getCategoryTint(n).bg))
    expect(distinct.size).toBeGreaterThan(2)
  })

  it('keeps uncategorized labels neutral in both locales', () => {
    expect(getCategoryTint('Uncategorized')).toEqual({ bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' })
    expect(getCategoryTint('Tanpa kategori')).toEqual({ bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' })
    expect(getCategoryIcon('Tanpa kategori')).toBe(Tag)
  })

  it('handles nullish input', () => {
    expect(getCategoryTint(null)).toEqual({ bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' })
    expect(getCategoryTint(undefined)).toEqual({ bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' })
  })

  it('pins the hash fallback so algorithm changes are caught', () => {
    expect(getCategoryTint('Alpha')).toEqual({ bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' })
  })
})
