import { buildYearlyRows } from '@/hooks/useYearlySimulation'

// Task 5: the yearly simulation table's income column must grow at
// `annual_income_growth`, while the expense column keeps growing at inflation.
//
// useYearlySimulation() itself takes no params and is wired to 6 React Query / auth
// hooks. Rather than mock the entire dependency graph, the pure row-building math has
// been extracted into the exported `buildYearlyRows(...)` helper (see the hook). We
// unit-test that helper directly — it is what carries the income-growth contract.

describe('buildYearlyRows — income grows at annual_income_growth, expense at inflation', () => {
  const base = {
    netWorth: 0,
    yearOneIncome: 1_000_000,
    yearOneExpense: 1_000_000,
    inflationRate: 0.03,
    incomeGrowth: 0.08,
    annualReturn: 0, // isolate cashflow: no investment return
    horizonYears: 5,
    startYear: 2026,
    retirementYear: null,
    eventImpacts: new Map(),
    baseDate: new Date('2026-01-01'),
    dob: null,
  }

  it('year index 1 income ≈ yearOneIncome × 1.08 and expense ≈ yearOneExpense × 1.03', () => {
    const rows = buildYearlyRows(base)

    // y=1 is the second row (the second simulated year)
    const y1 = rows[1]
    expect(y1.yearIndex).toBe(1)
    // income column grows at 8%
    expect(y1.income).toBeCloseTo(1_000_000 * 1.08, 2)
    // expense column grows at inflation (3%)
    expect(y1.expense).toBeCloseTo(1_000_000 * 1.03, 2)
  })

  it('year index 0 is unchanged (factor = 1 for both)', () => {
    const rows = buildYearlyRows(base)
    expect(rows[0].income).toBeCloseTo(1_000_000, 2)
    expect(rows[0].expense).toBeCloseTo(1_000_000, 2)
  })

  it('income and expense diverge in later years (compounding at different rates)', () => {
    const rows = buildYearlyRows(base)
    const y3 = rows[3]
    expect(y3.income).toBeCloseTo(1_000_000 * Math.pow(1.08, 3), 1)
    expect(y3.expense).toBeCloseTo(1_000_000 * Math.pow(1.03, 3), 1)
  })

  it('retired years zero out income but keep expense at inflation', () => {
    const rows = buildYearlyRows({ ...base, retirementYear: 2028 }) // y=2 onward
    expect(rows[2].income).toBe(0)
    expect(rows[2].expense).toBeCloseTo(1_000_000 * Math.pow(1.03, 2), 2)
  })
})
