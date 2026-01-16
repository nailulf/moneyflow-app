import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ParsedTransaction } from '@/lib/bank-parsers/types'
import { UnifiedStatementProcessor } from '@/components/UnifiedStatementProcessor'
import { useAccounts } from '@/contexts/AccountContext'
import { useCategories } from '@/contexts/CategoryContext'

// Mocks
jest.mock('@/contexts/AccountContext')
jest.mock('@/contexts/CategoryContext')
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

// Mock Select to make testing easier
jest.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, value, children }: any) => (
    <div data-testid="mock-select" data-value={value}>
       <input 
         data-testid="select-trigger-input"
         value={value || ''}
         onChange={(e) => onValueChange(e.target.value)} 
         style={{ display: 'none' }}
       />
       {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder || 'SelectValue'}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <div data-testid={`select-item-${value}`} data-value={value}>
      {children}
    </div>
  ),
}))

// Mock Dialog to avoid Radix UI issues in tests
jest.mock('../../components/ui/dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: any) => {
    return open ? (
      <div data-testid="dialog">
        <button data-testid="dialog-close" onClick={() => onOpenChange(false)}>Close Dialog</button>
        {children}
      </div>
    ) : null
  },
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

// Improved Virtualizer Mock to render all items based on count
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn((options) => ({
    getTotalSize: () => options.count * 64,
    getVirtualItems: () => {
      // Use standard array creation to avoid Array.from issues in some environments
      return new Array(options.count).fill(null).map((_, i) => ({
        index: i,
        size: 64,
        start: i * 64,
        key: i.toString()
      }))
    },
    scrollToIndex: jest.fn(),
  }))
}))

global.fetch = jest.fn()
// Mock confirm dialog
global.confirm = jest.fn(() => true)

describe('UnifiedStatementProcessor', () => {
  const mockAccounts = [{ id: 'acc1', name: 'Bank A', type: 'BANK', is_active: true }]
  const mockCategories = [
    { id: 'cat1', name: 'Groceries' },
    { id: 'cat2', name: 'Utilities' }
  ]
  const mockTransactions = [
    { date: '2023-01-01', description: 'Transaction 1', amount: -100, category_id: 'cat1', currency: 'IDR' },
    { date: '2023-01-02', description: 'Transaction 2', amount: -200, category_id: undefined, currency: 'IDR' }
  ]

  beforeEach(() => {
    jest.clearAllMocks();
    (useAccounts as jest.Mock).mockReturnValue({ accounts: mockAccounts, loading: false });
    (useCategories as jest.Mock).mockReturnValue({ categories: mockCategories });
    // Default successful upload response
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/statements/parse')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            preview: {
              transactions: mockTransactions,
              statement: { bankName: 'Test Bank' }
            }
          })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  const uploadFile = async () => {
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    render(<UnifiedStatementProcessor userId="user1" defaultAccountId="acc1" />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    const uploadButton = screen.getByText(/Upload & Process/i)
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/Review Transactions/i)).toBeInTheDocument()
    })
  }

  it('renders upload state initially', () => {
    render(<UnifiedStatementProcessor userId="user1" />)
    expect(screen.getByText(/Drop your PDF statement here/i)).toBeInTheDocument()
    expect(screen.getByText(/Upload & Process/i)).toBeDisabled()
  })

  it('handles file upload and transitions to review modal', async () => {
    await uploadFile()
    expect(screen.getByDisplayValue('Transaction 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Transaction 2')).toBeInTheDocument()
    // Check initial selection (all selected by default)
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument()
  })

  it('allows editing transaction fields', async () => {
    await uploadFile()
    
    const descriptionInputs = screen.getAllByPlaceholderText('Description')
    fireEvent.change(descriptionInputs[0], { target: { value: 'Updated Trans 1' } })
    expect(descriptionInputs[0]).toHaveValue('Updated Trans 1')

    const amountInputs = screen.getAllByDisplayValue('100')
    fireEvent.change(amountInputs[0], { target: { value: '150' } })
    expect(amountInputs[0]).toHaveValue(150)
  })

  it('validates required fields', async () => {
    await uploadFile()
    
    const descriptionInputs = screen.getAllByPlaceholderText('Description')
    fireEvent.change(descriptionInputs[0], { target: { value: '' } })
    expect(descriptionInputs[0]).toHaveValue('')
    expect(descriptionInputs[0]).toHaveClass('border-red-500')
  })

  it('handles bulk selection', async () => {
    await uploadFile()
    
    // Verify initial state (all selected)
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument()

    const dialog = screen.getByTestId('dialog')
    const checkboxes = within(dialog).getAllByRole('checkbox')
    // 1 header + 2 rows = 3 checkboxes
    expect(checkboxes).toHaveLength(3)

    // First checkbox is "Select All"
    fireEvent.click(checkboxes[0])
    
    await waitFor(() => {
      expect(screen.getByText(/0 of 2 selected/i)).toBeInTheDocument()
    })

    // Select single row
    fireEvent.click(checkboxes[1])
    
    await waitFor(() => {
      expect(screen.getByText(/1 of 2 selected/i)).toBeInTheDocument()
    })
  })

  it('filters transactions', async () => {
    await uploadFile()
    
    const dialog = screen.getByTestId('dialog')
    const inputs = within(dialog).getAllByTestId('select-trigger-input')
    // inputs[0] is Type Filter in the toolbar
    
    // Filter to INCOME
    fireEvent.change(inputs[0], { target: { value: 'INCOME' } })
    
    // Expect 0 rows (since both are expense)
    await waitFor(() => {
        const checkboxes = within(dialog).getAllByRole('checkbox')
        expect(checkboxes).toHaveLength(1) // Header only
    })
    
    // Filter to EXPENSE
    fireEvent.change(inputs[0], { target: { value: 'EXPENSE' } })
    await waitFor(() => {
        const checkboxes = within(dialog).getAllByRole('checkbox')
        expect(checkboxes).toHaveLength(3) // Header + 2 rows
    })
  })

  it('handles auto-categorization trigger', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
       if (url.includes('/api/statements/parse')) {
         return Promise.resolve({
            ok: true,
            json: async () => ({
                success: true,
                preview: { transactions: mockTransactions, statement: { bankName: 'Test' } }
            })
         })
       }
       if (url.includes('/api/ai/categorize')) {
         return Promise.resolve({
           ok: true,
           json: async () => ({
             assignments: [{ id: 1, categoryId: 'cat2' }]
           })
         })
       }
       return Promise.resolve({ ok: true })
    })
    
    await uploadFile();

    const categorizeBtn = screen.getByText(/Re-categorize/i)
    fireEvent.click(categorizeBtn)

    await waitFor(() => {
      const toast = require('sonner').toast
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Categorized 1'))
    })
  })

  it('handles import submission successfully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
       if (url.includes('/api/statements/parse')) {
         return Promise.resolve({
            ok: true,
            json: async () => ({
                success: true,
                preview: { transactions: mockTransactions, statement: { bankName: 'Test' } }
            })
         })
       }
       if (url.includes('/api/statements/confirm')) {
         return Promise.resolve({
           ok: true,
           json: async () => ({ count: 2 })
         })
       }
       return Promise.resolve({ ok: true })
    })
    
    await uploadFile();

    const importBtn = screen.getByText(/Add to Transaction List/i)
    fireEvent.click(importBtn)

    await waitFor(() => {
      const toast = require('sonner').toast
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('imported 2'))
    })
    
    // Should close modal and return to upload
    expect(screen.queryByText(/Review Transactions/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Drop your PDF statement here/i)).toBeInTheDocument()
  })

  it('handles import failure', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
       if (url.includes('/api/statements/parse')) {
         return Promise.resolve({
            ok: true,
            json: async () => ({
                success: true,
                preview: { transactions: mockTransactions, statement: { bankName: 'Test' } }
            })
         })
       }
       if (url.includes('/api/statements/confirm')) {
         return Promise.resolve({
           ok: false,
           status: 500
         })
       }
       return Promise.resolve({ ok: true })
    })
    
    await uploadFile();

    const importBtn = screen.getByText(/Add to Transaction List/i)
    fireEvent.click(importBtn)

    await waitFor(() => {
      const toast = require('sonner').toast
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to import'))
    })
    
    // Should stay on review modal
    expect(screen.getByText(/Review Transactions/i)).toBeInTheDocument()
  })

  it('handles detailed transaction editing', async () => {
    await uploadFile()
    
    // 1. Edit Date
    const dateInputs = screen.getAllByDisplayValue('2023-01-01')
    fireEvent.change(dateInputs[0], { target: { value: '2023-02-01' } })
    expect(dateInputs[0]).toHaveValue('2023-02-01')

    // 2. Edit Type
    const dialog = screen.getByTestId('dialog')
    const inputs = within(dialog).getAllByTestId('select-trigger-input')
    // inputs[0] is Type Filter
    // inputs[1] is Row 1 Type
    
    fireEvent.change(inputs[1], { target: { value: 'INCOME' } })
    expect(inputs[1]).toHaveValue('INCOME')

    // 3. Edit Merchant
    const merchantInputs = screen.getAllByPlaceholderText('Merchant')
    fireEvent.change(merchantInputs[0], { target: { value: 'New Merchant' } })
    expect(merchantInputs[0]).toHaveValue('New Merchant')

    // 4. Edit Notes
    const notesInputs = screen.getAllByPlaceholderText('Notes')
    fireEvent.change(notesInputs[0], { target: { value: 'My Note' } })
    expect(notesInputs[0]).toHaveValue('My Note')

    // 5. Edit Category
    // inputs[2] is Row 1 Category
    fireEvent.change(inputs[2], { target: { value: 'cat2' } })
    expect(inputs[2]).toHaveValue('cat2')
  })

  it('handles modal close cancellation', async () => {
    // Inline uploadFile logic to avoid scope issues
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    render(<UnifiedStatementProcessor userId="user1" defaultAccountId="acc1" />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    const uploadButton = screen.getByText(/Upload & Process/i)
    fireEvent.click(uploadButton)
    await waitFor(() => {
      expect(screen.getByText(/Review Transactions/i)).toBeInTheDocument()
    })
    
    // Mock confirm to return false (Cancel)
    ;(global.confirm as jest.Mock).mockReturnValue(false)
    
    const closeBtn = screen.getByTestId('dialog-close')
    fireEvent.click(closeBtn)
    
    // Should still be open
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    
    // Mock confirm to return true (Confirm)
    ;(global.confirm as jest.Mock).mockReturnValue(true)
    fireEvent.click(closeBtn)
    
    // Should be closed
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('handles invalid currency gracefully', async () => {
    // Override fetch for this test
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
        if (url.includes('/api/statements/parse')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    success: true,
                    preview: {
                        transactions: [{ date: '2023-01-01', description: 'Invalid Curr', amount: 50000, category_id: 'cat1', currency: 'RP' }],
                        statement: { bankName: 'Test Bank' }
                    }
                })
            })
        }
        return Promise.resolve({ ok: true })
    })

    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    render(<UnifiedStatementProcessor userId="user1" defaultAccountId="acc1" />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByText(/Upload & Process/i))

    await waitFor(() => {
      expect(screen.getByText(/Review Transactions/i)).toBeInTheDocument()
    })

    // Check formatting - expect fallback to IDR which uses Rp
    expect(screen.getAllByText(/50.000/).length).toBeGreaterThan(0)
  })

  it('handles large transaction lists (load test)', async () => {
    // Use loop to create array
    const largeTransactions: ParsedTransaction[] = []
    for (let i = 0; i < 1000; i++) {
        largeTransactions.push({
            date: '2023-01-01',
            description: `Transaction ${i}`,
            amount: -100,
            category_id: undefined,
            currency: 'IDR',
            rawData: '' // Added required field
        })
    }

    // Override fetch for this test
    (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/statements/parse')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    success: true,
                    preview: {
                        transactions: largeTransactions,
                        statement: { bankName: 'Test Bank' }
                    }
                })
            })
        }
        return Promise.resolve({ ok: true })
    })

    await uploadFile()

    // Verify virtualizer handles it
    expect(screen.getByText(/1000 of 1000 selected/i)).toBeInTheDocument()
    
    // Check first and last items
    expect(screen.getByDisplayValue('Transaction 0')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Transaction 999')).toBeInTheDocument()
  })

  it('handles drag and drop', async () => {
    render(<UnifiedStatementProcessor userId="user1" defaultAccountId="acc1" />)
    const dropZone = screen.getByText(/Drop your PDF statement here/i).closest('div')
    
    // Test dragover
    fireEvent.dragOver(dropZone!)
    
    // Test drop
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } })
    
    // Should verify file is selected
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('handles single item deselection', async () => {
    await uploadFile()
    
    // Initial state: 2 of 2 selected
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument()
    
    // Find checkboxes
    const dialog = screen.getByTestId('dialog')
    const checkboxes = within(dialog).getAllByRole('checkbox')
    // checkboxes[0] = Select All
    // checkboxes[1] = Row 1
    // checkboxes[2] = Row 2
    
    // Deselect Row 1
    fireEvent.click(checkboxes[1])
    
    // Should be 1 of 2 selected
    expect(screen.getByText(/1 of 2 selected/i)).toBeInTheDocument()
    
    // Select All checkbox should be unchecked
    expect(checkboxes[0]).not.toBeChecked()
    
    // Select Row 1 again
    fireEvent.click(checkboxes[1])
    
    // Should be 2 of 2 selected
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument()
    expect(checkboxes[0]).toBeChecked()
  })

  it('toggles AI checkbox', () => {
    render(<UnifiedStatementProcessor userId="user1" />)
    const checkbox = screen.getByLabelText(/Use AI/i)
    
    expect(checkbox).toBeChecked() // Default true
    
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
    
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('opens file selector on click', () => {
    render(<UnifiedStatementProcessor userId="user1" />)
    const dropZone = screen.getByText(/Drop your PDF statement here/i).closest('div')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = jest.spyOn(fileInput, 'click')
    
    fireEvent.click(dropZone!)
    expect(clickSpy).toHaveBeenCalled()
  })

  it('handles auto-categorization failure', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
       if (url.includes('/api/statements/parse')) {
         return Promise.resolve({
            ok: true,
            json: async () => ({
                success: true,
                preview: { transactions: mockTransactions, statement: { bankName: 'Test' } }
            })
         })
       }
       if (url.includes('/api/ai/categorize')) {
         return Promise.resolve({
           ok: false
         })
       }
       return Promise.resolve({ ok: true })
    })
    
    await uploadFile();

    const categorizeBtn = screen.getByText(/Re-categorize/i)
    fireEvent.click(categorizeBtn)

    await waitFor(() => {
      const toast = require('sonner').toast
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to auto-categorize'))
    })
  })

  it('prevents import with no selection', async () => {
    await uploadFile()
    
    // Deselect all
    const dialog = screen.getByTestId('dialog')
    const checkboxes = within(dialog).getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Select All checkbox -> Deselect All
    
    await waitFor(() => {
        expect(screen.getByText(/0 of 2 selected/i)).toBeInTheDocument()
    })
    
    // Button should be disabled
    const importBtn = screen.getByText(/Add to Transaction List/i)
    expect(importBtn).toBeDisabled()
  })

  it('selects all transactions when "Select All" is clicked from unchecked state', async () => {
    await uploadFile()
    
    const dialog = screen.getByTestId('dialog')
    const checkboxes = within(dialog).getAllByRole('checkbox')
    
    // Deselect All
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(/0 of 2 selected/i)).toBeInTheDocument()
    
    // Select All again
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(/2 of 2 selected/i)).toBeInTheDocument()
  })

  it('filters transactions by text search', async () => {
    await uploadFile()
    
    const dialog = screen.getByTestId('dialog')
    const searchInput = screen.getByPlaceholderText(/Search description or merchant/i)
    
    fireEvent.change(searchInput, { target: { value: 'Transaction 1' } })
    
    await waitFor(() => {
       // Should show only 1 row (plus header)
       const checkboxes = within(dialog).getAllByRole('checkbox')
       expect(checkboxes).toHaveLength(2) // Header + 1 row
    })
    
    // Check specific content
    // Search input has this value too, so we expect multiple
    expect(screen.getAllByDisplayValue('Transaction 1').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByDisplayValue('Transaction 2')).not.toBeInTheDocument()
  })

  it('handles upload failure', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
       if (url.includes('/api/statements/parse')) {
         return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Upload failed' })
         })
       }
       return Promise.resolve({ ok: true })
    })
    
    // We can't use uploadFile() helper because it expects success
    render(<UnifiedStatementProcessor userId="user1" defaultAccountId="acc1" />)
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    const uploadButton = screen.getByText(/Upload & Process/i)
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      const toast = require('sonner').toast
      expect(toast.error).toHaveBeenCalledWith('Upload failed')
    })
  })
})
