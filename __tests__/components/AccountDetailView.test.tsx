import type { ReactElement } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AccountDetailView } from '@/components/AccountDetailView'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'

// Mock the hooks
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))
jest.mock('@/contexts/AccountContext')
jest.mock('@/contexts/AuthContext')
jest.mock('@/hooks/useTransactionsQuery')
jest.mock('next/navigation', () => ({
  useParams: () => ({ accountId: '123' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))

// Mock UI components that might cause issues in tests
jest.mock('@/components/features/navigation/TopNavigation', () => ({
  AccountNavigation: () => <div data-testid="account-navigation">Nav</div>
}))
jest.mock('@/components/features/transaction/TransactionTable', () => ({
  TransactionTable: () => <div data-testid="transaction-table">Transaction Table</div>
}))
jest.mock('@/components/features/goals', () => ({
  GoalSection: () => <div data-testid="goal-section">Goal Section</div>
}))

// Mock formatCurrency to return consistent string
jest.mock('@/lib/data-utils', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
}))

jest.mock('@/components/ui/molecules/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/components/ui/atoms/input', () => ({
  Input: (props: any) => <input {...props} />
}))

// Mock Tabs to simulate switching logic without Radix complexity
jest.mock('@/components/ui/molecules/tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext({ value: 'overview', setValue: (v: string) => {} });
  
  return {
    Tabs: ({ children, defaultValue }: any) => {
      const [value, setValue] = React.useState(defaultValue || 'overview');
      return (
        <TabsContext.Provider value={{ value, setValue }}>
          <div>{children}</div>
        </TabsContext.Provider>
      );
    },
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: any) => {
      const { setValue } = React.useContext(TabsContext);
      return (
        <button onClick={() => setValue(value)} role="tab">
          {children}
        </button>
      );
    },
    TabsContent: ({ value: contentValue, children }: any) => {
      const { value } = React.useContext(TabsContext);
      return value === contentValue ? <div>{children}</div> : null;
    },
  };
});

describe('AccountDetailView', () => {
  const mockAccount = {
    id: '123',
    name: 'Test Account',
    type: 'BANK',
    balance: 1000,
    currency: 'USD',
    is_active: true,
    is_default: false,
    description: 'Test Description'
  }

  const mockDeleteAccount = jest.fn()
  const mockUpdateAccount = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'user1' } });
    (useAccounts as jest.Mock).mockReturnValue({
      accounts: [mockAccount],
      loading: false,
      deleteAccount: mockDeleteAccount,
      updateAccount: mockUpdateAccount
    });
    (useAllTransactions as jest.Mock).mockReturnValue({
      transactions: [],
      isLoading: false
    });
  })

  it('renders account details correctly', () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    expect(screen.getByText('Test Account')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    // formatCurrency mock returns $1000.00
    expect(screen.getAllByText('$1000.00').length).toBeGreaterThan(0)
  })

  it('renders tabs', () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    expect(screen.getByRole('tab', { name: 'tabs.overview' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'tabs.transactions' })).toBeInTheDocument()
  })

  it('renders transactions table when tab is clicked', async () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    
    const transactionsTab = screen.getByRole('tab', { name: 'tabs.transactions' })
    fireEvent.click(transactionsTab)
    
    // With our mock, this should be synchronous
    expect(screen.getByTestId('transaction-table')).toBeInTheDocument()
  })

  it('renders action buttons', () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    expect(screen.getByText('actions.edit')).toBeInTheDocument()
    expect(screen.getByText('actions.delete')).toBeInTheDocument()
    expect(screen.getByText('actions.export')).toBeInTheDocument()
  })

  it('opens edit dialog when edit button is clicked', async () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    
    fireEvent.click(screen.getByText('actions.edit'))
    
    expect(await screen.findByText('editDialog.title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Account')).toBeInTheDocument()
  })

  it.skip('calls updateAccount when save changes is clicked', async () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    
    fireEvent.click(screen.getByText('actions.edit'))
    
    const nameInput = screen.getByLabelText('editDialog.name')
    
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Updated Account' } })
    })

    expect(nameInput).toHaveValue('Updated Account')
    
    fireEvent.click(screen.getByText('Save changes'))
    
    await waitFor(() => {
        expect(mockUpdateAccount).toHaveBeenCalledWith('123', { name: 'Updated Account' })
    })
  })

  it('opens delete dialog when delete button is clicked', async () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    
    fireEvent.click(screen.getByText('actions.delete'))
    
    expect(await screen.findByText('deleteDialog.description')).toBeInTheDocument()
  })

  it('calls deleteAccount when confirm delete is clicked', async () => {
    renderWithClient(<AccountDetailView accountId="123" />)
    
    fireEvent.click(screen.getByText('actions.delete'))
    
    // In the dialog, there is a button "Delete"
    // We need to be specific because there might be multiple "Delete" texts
    const deleteButton = screen.getByRole('button', { name: 'deleteDialog.delete' })
    fireEvent.click(deleteButton)
    
    expect(mockDeleteAccount).toHaveBeenCalledWith('123')
  })
})

const renderWithClient = (ui: ReactElement) => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
