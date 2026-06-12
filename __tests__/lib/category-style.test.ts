import {
  Utensils, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  GraduationCap, Plane, Briefcase, ArrowLeftRight, PiggyBank, CreditCard, Coffee, Tag,
} from 'lucide-react'
import { getCategoryIcon } from '@/lib/category-style'

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
    expect(getCategoryIcon('Tabungan')).toBe(PiggyBank)
  })

  it('falls back to Tag for unknown, empty, and nullish names', () => {
    expect(getCategoryIcon('Zzz Unknown')).toBe(Tag)
    expect(getCategoryIcon('')).toBe(Tag)
    expect(getCategoryIcon(null)).toBe(Tag)
    expect(getCategoryIcon(undefined)).toBe(Tag)
  })
})
