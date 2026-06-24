import { defaultScenarioPayload, buildDraft } from '@/lib/forecast/types'

describe('scenario annual_income_growth', () => {
  it('defaults to 0', () => {
    expect(defaultScenarioPayload.annual_income_growth).toBe(0)
  })
  it('coerces a string row value to a number', () => {
    const draft = buildDraft({
      // minimal row; cast as any to avoid listing every column
      annual_income_growth: '0.08',
      inflation_rate: '0.03',
      expected_annual_return: '0.07',
      annual_volatility: '0.12',
      monthly_contribution: '0',
      monthly_withdrawal: '0',
      target_net_worth: '0',
      horizon_years: 10,
      include_cashflow: true,
      name: 'Test',
      description: null,
      start_date: '2026-06-24',
      is_default: false,
      id: '123',
      user_id: 'abc',
      created_at: '2026-06-24T00:00:00Z',
      updated_at: '2026-06-24T00:00:00Z',
    } as any)
    expect(draft.annual_income_growth).toBe(0.08)
  })
})
