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
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  // The OAuth-finalize landing effect reads `?oauth_finalize=1`; default to a
  // param-less URL so these (email-path) tests render the form, not the
  // finalizing state.
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

const convertWithEmail = jest.fn().mockResolvedValue({ merged: false })
const convertWithOAuth = jest.fn().mockResolvedValue(undefined)
const continueAsGuest = jest.fn().mockResolvedValue(undefined)
const resendConfirmation = jest.fn().mockResolvedValue(true)
const finalizePendingOAuthDraft = jest.fn().mockResolvedValue(false)
jest.mock('@/lib/onboarding/convert', () => ({
  convertWithEmail: (...args: unknown[]) => convertWithEmail(...args),
  convertWithOAuth: (...args: unknown[]) => convertWithOAuth(...args),
  continueAsGuest: (...args: unknown[]) => continueAsGuest(...args),
  resendConfirmation: (...args: unknown[]) => resendConfirmation(...args),
  finalizePendingOAuthDraft: (...args: unknown[]) => finalizePendingOAuthDraft(...args),
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

  it('opens directly on the create-account form (no separate intro step)', () => {
    render(<ConvertPage />)
    // The flow result pages are the conversion point now, so /start/save opens
    // straight on the form — there is no "your plan is ready" intro to reveal.
    expect(screen.getByTestId('convert-email')).toBeInTheDocument()
    expect(screen.getByTestId('convert-password')).toBeInTheDocument()
  })

  it('submits valid credentials via convertWithEmail', async () => {
    render(<ConvertPage />)

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
