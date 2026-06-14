import { render, screen } from '@testing-library/react'
import OfflinePage from '@/app/offline/page'

describe('OfflinePage', () => {
  it('renders the offline message and a retry control (English default)', () => {
    render(<OfflinePage />)
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('renders Indonesian copy when navigator.language is Indonesian', () => {
    const original = navigator.language
    Object.defineProperty(navigator, 'language', { value: 'id-ID', configurable: true })
    render(<OfflinePage />)
    expect(screen.getByText('Anda sedang offline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument()
    Object.defineProperty(navigator, 'language', { value: original, configurable: true })
  })
})
