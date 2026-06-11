import { render, screen } from '@testing-library/react'
import OfflinePage from '@/app/offline/page'

describe('OfflinePage', () => {
  it('renders the offline message and a retry control (English default)', () => {
    render(<OfflinePage />)
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
