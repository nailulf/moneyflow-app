import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

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
jest.mock('@/lib/onboarding/convert', () => ({
  convertWithEmail: (...args: unknown[]) => convertWithEmail(...args),
  convertWithOAuth: (...args: unknown[]) => convertWithOAuth(...args),
  continueAsGuest: (...args: unknown[]) => continueAsGuest(...args),
}))

import ConvertPage from '@/app/start/save/page'

describe('ConvertPage', () => {
  beforeEach(() => {
    push.mockClear()
    convertWithEmail.mockClear()
    convertWithOAuth.mockClear()
    continueAsGuest.mockClear()
  })

  it('calls continueAsGuest when "Continue as guest" is clicked on the intro step', () => {
    render(<ConvertPage />)
    fireEvent.click(screen.getByRole('button', { name: /intro\.guestCta/i }))
    expect(continueAsGuest).toHaveBeenCalledTimes(1)
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

    expect(convertWithEmail).toHaveBeenCalledWith('jane@example.com', 'secret123')
  })
})
