import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/components/features/navigation/nav-user', () => ({
  NavUser: ({ user }: { user: { name: string } }) => <div data-testid="nav-user">{user.name}</div>,
}))

import { MobileScreenHeader } from '@/components/features/navigation/MobileScreenHeader'

const user = { name: 'Nailul', email: 'n@example.com', avatar: '/avatars/01.svg' }

describe('MobileScreenHeader', () => {
  it('renders the title as a level-1 heading', () => {
    render(<MobileScreenHeader title="Budget" user={user} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument()
  })

  it('renders the NavUser avatar menu with the given user', () => {
    render(<MobileScreenHeader title="Budget" user={user} />)
    expect(screen.getByTestId('nav-user')).toHaveTextContent('Nailul')
  })

  it('renders an optional action slot before the avatar', () => {
    render(
      <MobileScreenHeader title="Budget" user={user} action={<button type="button">act</button>} />
    )
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument()
  })
})
