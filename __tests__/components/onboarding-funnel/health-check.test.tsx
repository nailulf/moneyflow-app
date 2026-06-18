import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Interpolating translation mock so {rate}/{months} placeholders resolve.
jest.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        continue: 'Continue',
        seeHealth: 'See my health',
        bandOnTrack: 'On track',
        bandCanImprove: 'Can improve',
        bandNeedsWork: 'Needs work',
        detailSavings: `${values?.rate}% of income saved`,
        detailDebt: `${values?.pct}% goes to debt`,
        detailEmergency: `${values?.months} months of spending`,
        detailNetWorth: `${values?.amount} · ${values?.sign}`,
        saveCta: 'Save my results',
        buildBudgetCta: 'Build a budget to improve it',
      }
      return labels[key] ?? key
    },
  useLocale: () => 'en',
}))

const ensureAnonymousSession = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/supabase/anonymous', () => ({
  ensureAnonymousSession: () => ensureAnonymousSession(),
}))

const advanceOnboarding = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/api/onboarding-funnel', () => ({
  advanceOnboarding: (...args: unknown[]) => advanceOnboarding(...args),
}))

import HealthCheckPage from '@/app/start/health-check/page'

/** Drive the flow from step 1 through to the result. */
async function completeFlow() {
  // Step 1 — income + spending
  fireEvent.change(screen.getByTestId('hc-income'), { target: { value: '10000000' } })
  fireEvent.change(screen.getByTestId('hc-spending'), { target: { value: '6000000' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  })

  // Step 2 — savings + investments
  fireEvent.change(screen.getByTestId('hc-savings'), { target: { value: '30000000' } })
  fireEvent.change(screen.getByTestId('hc-investments'), { target: { value: '20000000' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  })

  // Step 3 — debts → compute
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /see my health/i }))
  })
}

describe('HealthCheckPage (multi-step)', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
    advanceOnboarding.mockClear()
  })

  it('fires the anonymous session lazily on mount', () => {
    render(<HealthCheckPage />)
    expect(ensureAnonymousSession).toHaveBeenCalledTimes(1)
  })

  it('disables Continue on step 1 until income is entered', () => {
    render(<HealthCheckPage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()

    fireEvent.change(screen.getByTestId('hc-income'), { target: { value: '5000000' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('walks through all steps and renders the score gauge', async () => {
    render(<HealthCheckPage />)
    await completeFlow()

    const scoreEl = screen.getByTestId('hc-score')
    expect(scoreEl).toBeInTheDocument()
    // Healthy profile (40% savings, 5mo fund, positive net worth, no debt) scores 100.
    expect(scoreEl).toHaveTextContent('100')
    expect(screen.getByText('On track')).toBeInTheDocument()
  })

  it('logs the score via advanceOnboarding (best-effort)', async () => {
    render(<HealthCheckPage />)
    await completeFlow()

    expect(advanceOnboarding).toHaveBeenCalledWith(
      'health_check',
      expect.objectContaining({
        event_type: 'step_completed',
        metadata: expect.objectContaining({ score: 100 }),
      })
    )
  })

  it('routes to the save funnel from the result conversion CTA', async () => {
    render(<HealthCheckPage />)
    await completeFlow()

    // The result screen is the conversion point — "Create free account" routes
    // straight to the signup form.
    fireEvent.click(screen.getByRole('button', { name: /createAccount/i }))
    expect(push).toHaveBeenCalledWith('/start/save')
  })
})
