import { buildBudgetTrimPlan } from '@/lib/onboarding/plan-math'

const CATS = [
  { slug: 'housing', name: 'Housing & rent', amount: 2_000_000 },
  { slug: 'food', name: 'Food & groceries', amount: 1_500_000 },
  { slug: 'transport', name: 'Transport', amount: 1_000_000 },
  { slug: 'bills', name: 'Bills & subscriptions', amount: 500_000 },
  { slug: 'lifestyle', name: 'Lifestyle & fun', amount: 2_000_000 },
]

describe('buildBudgetTrimPlan', () => {
  it('computes freeNow and the gap against the fixed savings goal', () => {
    // total spend 7M, income 8M → freeNow 1M; goal 2M → gap 1M
    const plan = buildBudgetTrimPlan({ income: 8_000_000, savingsGoal: 2_000_000, categories: CATS })
    expect(plan.freeNow).toBe(1_000_000)
    expect(plan.gap).toBe(1_000_000)
  })

  it('never suggests trimming Housing & rent', () => {
    const plan = buildBudgetTrimPlan({ income: 8_000_000, savingsGoal: 2_000_000, categories: CATS })
    expect(plan.suggestions.map((s) => s.slug)).not.toContain('housing')
  })

  it('orders suggestions by largest trim first with rounded amounts', () => {
    const plan = buildBudgetTrimPlan({ income: 8_000_000, savingsGoal: 2_000_000, categories: CATS })
    // lifestyle 2M×.35=700k, food 1.5M×.15≈250k, transport 1M×.2=200k, bills 500k×.15≈100k
    expect(plan.suggestions.map((s) => [s.slug, s.trim])).toEqual([
      ['lifestyle', 700_000],
      ['food', 250_000],
      ['transport', 200_000],
      ['bills', 100_000],
    ])
    expect(plan.suggestions[0].suggested).toBe(1_300_000) // 2M − 700k
  })

  it('pre-selects the fewest largest trims that cover the gap', () => {
    const plan = buildBudgetTrimPlan({ income: 8_000_000, savingsGoal: 2_000_000, categories: CATS })
    // gap 1M: lifestyle 700k + food 250k = 950k (<1M) → add transport 200k = 1.15M ≥ 1M
    expect(plan.preselected).toEqual(['lifestyle', 'food', 'transport'])
    expect(plan.coverable).toBe(true)
  })

  it('returns no pre-selected trims when already free to hit the goal (on track)', () => {
    // freeNow 3M ≥ goal 1M → gap 0
    const plan = buildBudgetTrimPlan({
      income: 8_000_000,
      savingsGoal: 1_000_000,
      categories: [{ slug: 'housing', name: 'Housing & rent', amount: 3_000_000 }, ...CATS.slice(1, 3)],
    })
    expect(plan.gap).toBe(0)
    expect(plan.preselected).toEqual([])
  })

  it('flags coverable=false when trimming everything still falls short', () => {
    // freeNow 500k, goal 2M → gap 1.5M; only bills is trimmable (~100k) « gap
    const plan = buildBudgetTrimPlan({
      income: 5_000_000,
      savingsGoal: 2_000_000,
      categories: [
        { slug: 'housing', name: 'Housing & rent', amount: 4_000_000 },
        { slug: 'bills', name: 'Bills & subscriptions', amount: 500_000 },
      ],
    })
    expect(plan.gap).toBe(1_500_000)
    expect(plan.coverable).toBe(false)
    expect(plan.preselected).toEqual(['bills'])
  })

  it('treats custom (extra-N) categories as moderately trimmable', () => {
    const plan = buildBudgetTrimPlan({
      income: 8_000_000,
      savingsGoal: 8_000_000,
      categories: [{ slug: 'extra-1', name: 'Pets', amount: 1_000_000 }],
    })
    // 1M × 0.2 = 200k
    expect(plan.suggestions[0]).toMatchObject({ slug: 'extra-1', trim: 200_000, suggested: 800_000 })
  })
})
