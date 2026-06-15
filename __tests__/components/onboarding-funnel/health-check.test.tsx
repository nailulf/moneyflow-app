import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Interpolating translation mock so {rate} placeholders resolve.
jest.mock('next-intl', () => ({
  useTranslations:
    () =>
    (key: string, values?: Record<string, string | number>) => {
      const labels: Record<string, string> = {
        seeScore: 'See my score',
        savingsRate: `You are saving ${values?.rate}% of your income`,
        bandHealthy: 'Healthy',
        bandGettingThere: 'Getting there',
        bandNeedsAttention: 'Needs attention',
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

describe('HealthCheckPage', () => {
  beforeEach(() => {
    push.mockClear()
    ensureAnonymousSession.mockClear()
    advanceOnboarding.mockClear()
  })

  it('disables "See my score" until income and spend are entered', () => {
    render(<HealthCheckPage />)
    expect(screen.getByRole('button', { name: /see my score/i })).toBeDisabled()
  })

  it('computes the score and shows the result after See my score', async () => {
    render(<HealthCheckPage />)

    fireEvent.change(screen.getByTestId('hc-income'), { target: { value: '10000000' } })
    fireEvent.change(screen.getByTestId('hc-spend'), { target: { value: '6000000' } })

    expect(screen.getByRole('button', { name: /see my score/i })).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /see my score/i }))
    })

    // healthScore(10M, 6M) = round(0.4 * 200) = 80 → "Healthy"
    const scoreEl = screen.getByTestId('hc-score')
    expect(scoreEl).toBeInTheDocument()
    expect(scoreEl).toHaveTextContent('80')
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })
})
