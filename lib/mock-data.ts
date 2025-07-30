import { Transaction } from '@/types/database'
import { CATEGORIES } from '@/types/app'

// Mock transaction data for development
export const mockTransactions: Transaction[] = [
  {
    id: '1',
    user_id: 'user1',
    date: '2024-01-15',
    description: 'Grocery Shopping',
    amount: -85.50,
    category: 'Food & Dining',
    merchant: 'Whole Foods',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    user_id: 'user1',
    date: '2024-01-14',
    description: 'Gas Station',
    amount: -45.00,
    category: 'Transportation',
    merchant: 'Shell',
    created_at: '2024-01-14T15:30:00Z',
    updated_at: '2024-01-14T15:30:00Z'
  },
  {
    id: '3',
    user_id: 'user1',
    date: '2024-01-13',
    description: 'Salary',
    amount: 3500.00,
    category: 'Income',
    merchant: 'Company Inc',
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T09:00:00Z'
  },
  {
    id: '4',
    user_id: 'user1',
    date: '2024-01-12',
    description: 'Netflix Subscription',
    amount: -15.99,
    category: 'Entertainment',
    merchant: 'Netflix',
    created_at: '2024-01-12T12:00:00Z',
    updated_at: '2024-01-12T12:00:00Z'
  },
  {
    id: '5',
    user_id: 'user1',
    date: '2024-01-11',
    description: 'Electric Bill',
    amount: -120.00,
    category: 'Bills & Utilities',
    merchant: 'Electric Company',
    created_at: '2024-01-11T14:00:00Z',
    updated_at: '2024-01-11T14:00:00Z'
  },
  {
    id: '6',
    user_id: 'user1',
    date: '2024-01-10',
    description: 'Coffee Shop',
    amount: -4.50,
    category: 'Food & Dining',
    merchant: 'Starbucks',
    created_at: '2024-01-10T08:30:00Z',
    updated_at: '2024-01-10T08:30:00Z'
  },
  {
    id: '7',
    user_id: 'user1',
    date: '2024-01-09',
    description: 'Online Shopping',
    amount: -89.99,
    category: 'Shopping',
    merchant: 'Amazon',
    created_at: '2024-01-09T16:45:00Z',
    updated_at: '2024-01-09T16:45:00Z'
  },
  {
    id: '8',
    user_id: 'user1',
    date: '2024-01-08',
    description: 'Doctor Visit',
    amount: 150.00,
    category: 'income',
    merchant: 'Medical Center',
    created_at: '2024-01-08T11:00:00Z',
    updated_at: '2024-01-08T11:00:00Z'
  },
  {
    id: '9',
    user_id: 'user1',
    date: '2024-01-07',
    description: 'Uber Ride',
    amount: -12.50,
    category: 'Transportation',
    merchant: 'Uber',
    created_at: '2024-01-07T19:20:00Z',
    updated_at: '2024-01-07T19:20:00Z'
  },
  {
    id: '10',
    user_id: 'user1',
    date: '2024-01-06',
    description: 'Freelance Work',
    amount: 500.00,
    category: 'Income',
    merchant: 'Client ABC',
    created_at: '2024-01-06T17:00:00Z',
    updated_at: '2024-01-06T17:00:00Z'
  },
  {
    id: '11',
    user_id: 'user1',
    date: '2024-02-20',
    description: 'Rent Payment',
    amount: -1200.00,
    category: 'Housing',
    merchant: 'Landlord',
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-02-20T09:00:00Z'
  },
  {
    id: '12',
    user_id: 'user1',
    date: '2024-02-10',
    description: 'Restaurant Dinner',
    amount: -75.00,
    category: 'Food & Dining',
    merchant: 'Fancy Eats',
    created_at: '2024-02-10T19:30:00Z',
    updated_at: '2024-02-10T19:30:00Z'
  },
  {
    id: '13',
    user_id: 'user1',
    date: '2024-02-05',
    description: 'Gym Membership',
    amount: -50.00,
    category: 'Health & Fitness',
    merchant: 'Fitness Club',
    created_at: '2024-02-05T08:00:00Z',
    updated_at: '2024-02-05T08:00:00Z'
  }
]

// Generate additional mock data for different months
export const generateMockTransactions = (months: number = 10): Transaction[] => {
  const transactions: Transaction[] = [...mockTransactions]
  const categories = CATEGORIES.filter(cat => cat !== 'Income')
  
  for (let month = 0; month < months; month++) {
    const date = new Date()
    date.setMonth(date.getMonth() - month)
    
    // Add income for each month
    transactions.push({
      id: `income-${month}`,
      user_id: 'user1',
      date: date.toISOString().split('T')[0],
      description: 'Monthly Salary',
      amount: 3500 + Math.random() * 500,
      category: 'Income',
      merchant: 'Company Inc',
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    })
    
    // Add random expenses
    for (let i = 0; i < 15; i++) {
      const expenseDate = new Date(date)
      expenseDate.setDate(Math.floor(Math.random() * 28) + 1)
      
      const category = categories[Math.floor(Math.random() * categories.length)]
      const amount = -(Math.random() * 200 + 10)
      
      transactions.push({
        id: `expense-${month}-${i}`,
        user_id: 'user1',
        date: expenseDate.toISOString().split('T')[0],
        description: `${category} expense`,
        amount: amount,
        category: category,
        merchant: 'Various',
        created_at: expenseDate.toISOString(),
        updated_at: expenseDate.toISOString()
      })
    }
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}