import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

const convertWithEmail = jest.fn().mockResolvedValue({ merged: false })
const convertWithOAuth = jest.fn().mockResolvedValue(undefined)
const continueAsGuest = jest.fn().mockResolvedValue(undefined)
const resendConfirmation = jest.fn().mockResolvedValue(true)
jest.mock('@/lib/onboarding/convert', () => ({
  convertWithEmail: (...args: unknown[]) => convertWithEmail(...args),
  convertWithOAuth: (...args: unknown[]) => convertWithOAuth(...args),
  continueAsGuest: (...args: unknown[]) => continueAsGuest(...args),
  resendConfirmation: (...args: unknown[]) => resendConfirmation(...args),
}))

import ConvertPage from '@/app/start/save/page'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'

describe('ConvertPage', () => {
  beforeEach(() => {
    push.mockClear()
    convertWithEmail.mockClear()
    convertWithEmail.mockResolvedValue({ merged: false })
    convertWithOAuth.mockClear()
    continueAsGuest.mockClear()
    resendConfirmation.mockClear()
    resendConfirmation.mockResolvedValue(true)
    // Default: no plan summary (signup-wall / generic-hero path).
    useFunnelStore.getState().reset()
  })

  it('calls continueAsGuest when the "Continue as guest" link is clicked on the intro step', () => {
    render(<ConvertPage />)
    // Guest exit is a quiet text link now, not a full button — but still a
    // <button> element, so query it by its accessible name.
    fireEvent.click(screen.getByText('intro.guestCta'))
    expect(continueAsGuest).toHaveBeenCalledTimes(1)
  })

  it('shows the generic celebration hero when no plan summary is set', () => {
    render(<ConvertPage />)
    expect(screen.getByText('intro.headline')).toBeInTheDocument()
    expect(screen.getByText('intro.subtext')).toBeInTheDocument()
  })

  it('renders the personalized payoff hero from the store planSummary', () => {
    useFunnelStore.getState().setPlanSummary({
      kind: 'goal',
      primary: 'Rp 2.400.000/mo',
      caption: 'Reach Emergency fund by Jun 2027',
    })
    render(<ConvertPage />)

    // The personalized primary + caption (pre-formatted strings) render…
    expect(screen.getByText('Rp 2.400.000/mo')).toBeInTheDocument()
    expect(screen.getByText('Reach Emergency fund by Jun 2027')).toBeInTheDocument()
    // …and the goal kind pill + personalized subtext show.
    expect(screen.getByText('intro.pillGoal')).toBeInTheDocument()
    expect(screen.getByText('intro.personalizedSubtext')).toBeInTheDocument()
    // The generic celebration headline is replaced.
    expect(screen.queryByText('intro.headline')).not.toBeInTheDocument()
  })

  it('reveals the form and submits valid credentials via convertWithEmail', async () => {
    render(<ConvertPage />)

    // Intro → form
    expect(screen.queryByTestId('convert-email')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /intro\.createCta/i }))
    expect(screen.getByTestId('convert-email')).toBeInTheDocument()

    // Fill valid email + password and agree to terms
    fireEvent.change(screen.getByTestId('convert-email'), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByTestId('convert-password'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByTestId('convert-terms'))

    const submit = screen.getByTestId('convert-submit')
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    await waitFor(() =>
      expect(convertWithEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'secret123',
        expect.objectContaining({ allocations: expect.any(Array), period: 'monthly' }),
      ),
    )
  })

  it('shows the verify-email state (and does not navigate) when conversion is pending verification', async () => {
    convertWithEmail.mockResolvedValue({ merged: false, pendingVerification: true })
    render(<ConvertPage />)

    fireEvent.click(screen.getByRole('button', { name: /intro\.createCta/i }))
    fireEvent.change(screen.getByTestId('convert-email'), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByTestId('convert-password'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByTestId('convert-terms'))
    fireEvent.click(screen.getByTestId('convert-submit'))

    // Verify state renders…
    expect(await screen.findByText('verify.title')).toBeInTheDocument()
    const resend = screen.getByRole('button', { name: /verify\.resendCta/i })
    expect(resend).toBeInTheDocument()
    // …and we did NOT navigate to the home page.
    expect(push).not.toHaveBeenCalled()

    // Resend triggers resendConfirmation with the entered email.
    fireEvent.click(resend)
    await waitFor(() =>
      expect(resendConfirmation).toHaveBeenCalledWith('jane@example.com'),
    )
  })
})
