import { ONBOARDING_SPEND_CATEGORIES, SPEND_SLUG_TO_NAME } from '@/lib/onboarding/spend-categories'

const SEED_EXPENSE_NAMES = [
  'Housing & rent', 'Food & groceries', 'Transport',
  'Bills & subscriptions', 'Lifestyle & fun',
]

describe('ONBOARDING_SPEND_CATEGORIES', () => {
  it('has the five core expense categories with canonical seed names', () => {
    expect(ONBOARDING_SPEND_CATEGORIES.map((c) => c.name).sort())
      .toEqual([...SEED_EXPENSE_NAMES].sort())
  })

  it('uses stable, unique slugs', () => {
    const slugs = ONBOARDING_SPEND_CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs).toEqual(['housing', 'food', 'transport', 'bills', 'lifestyle'])
  })

  it('exposes a slug→name map matching the list', () => {
    for (const c of ONBOARDING_SPEND_CATEGORIES) {
      expect(SPEND_SLUG_TO_NAME[c.slug]).toBe(c.name)
    }
  })
})
