import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => 'en',
}))

import IntentPage from '@/app/start/intent/page'

describe('IntentPage', () => {
  beforeEach(() => push.mockClear())

  it('disables Continue until a card is selected', () => {
    render(<IntentPage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    fireEvent.click(screen.getByTestId('intent-goal'))
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('routes to the goal flow when "track a goal" is chosen', () => {
    render(<IntentPage />)
    fireEvent.click(screen.getByTestId('intent-goal'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(push).toHaveBeenCalledWith('/start/goal/type')
  })

  it('routes to the health check when "check my financial health" is chosen', () => {
    render(<IntentPage />)
    fireEvent.click(screen.getByTestId('intent-health'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(push).toHaveBeenCalledWith('/start/health-check')
  })
})
