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
    type: 'EXPENSE',
    category_id: 'Food & Dining',
    merchant: 'Whole Foods',
    notes: null,
    tags: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    user_id: 'user1',
    date: '2024-01-14',
    description: 'Gas Station',
    amount: -45.00,
    type: 'EXPENSE',
    category_id: 'Transportation',
    merchant: 'Shell',
    notes: null,
    tags: null,
    created_at: '2024-01-14T15:30:00Z',
    updated_at: '2024-01-14T15:30:00Z'
  },
  {
    id: '3',
    user_id: 'user1',
    date: '2024-01-13',
    description: 'Salary',
    amount: 3500.00,
    type: 'INCOME',
    category_id: 'Income',
    merchant: 'Company Inc',
    notes: null,
    tags: null,
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T09:00:00Z'
  },
  {
    id: '4',
    user_id: 'user1',
    date: '2024-01-12',
    description: 'Netflix Subscription',
    amount: -15.99,
    type: 'EXPENSE',
    category_id: 'Entertainment',
    merchant: 'Netflix',
    notes: null,
    tags: null,
    created_at: '2024-01-12T12:00:00Z',
    updated_at: '2024-01-12T12:00:00Z'
  },
  {
    id: '5',
    user_id: 'user1',
    date: '2024-01-11',
    description: 'Electric Bill',
    amount: -120.00,
    type: 'EXPENSE',
    category_id: 'Bills & Utilities',
    merchant: 'Electric Company',
    notes: null,
    tags: null,
    created_at: '2024-01-11T14:00:00Z',
    updated_at: '2024-01-11T14:00:00Z'
  },
  {
    id: '6',
    user_id: 'user1',
    date: '2024-01-10',
    description: 'Coffee Shop',
    amount: -4.50,
    type: 'EXPENSE',
    category_id: 'Food & Dining',
    merchant: 'Starbucks',
    notes: null,
    tags: null,
    created_at: '2024-01-10T08:30:00Z',
    updated_at: '2024-01-10T08:30:00Z'
  },
  {
    id: '7',
    user_id: 'user1',
    date: '2024-01-09',
    description: 'Online Shopping',
    amount: -89.99,
    type: 'EXPENSE',
    category_id: 'Shopping',
    merchant: 'Amazon',
    notes: null,
    tags: null,
    created_at: '2024-01-09T16:45:00Z',
    updated_at: '2024-01-09T16:45:00Z'
  },
  {
    id: '8',
    user_id: 'user1',
    date: '2024-01-08',
    description: 'Doctor Visit',
    amount: 150.00,
    type: 'INCOME',
    category_id: 'Income',
    merchant: 'Medical Center',
    notes: null,
    tags: null,
    created_at: '2024-01-08T11:00:00Z',
    updated_at: '2024-01-08T11:00:00Z'
  },
  {
    id: '9',
    user_id: 'user1',
    date: '2024-01-07',
    description: 'Uber Ride',
    amount: -12.50,
    type: 'EXPENSE',
    category_id: 'Transportation',
    merchant: 'Uber',
    notes: null,
    tags: null,
    created_at: '2024-01-07T19:20:00Z',
    updated_at: '2024-01-07T19:20:00Z'
  },
  {
    id: '10',
    user_id: 'user1',
    date: '2024-01-06',
    description: 'Freelance Work',
    amount: 500.00,
    type: 'INCOME',
    category_id: 'Income',
    merchant: 'Client ABC',
    notes: null,
    tags: null,
    created_at: '2024-01-06T17:00:00Z',
    updated_at: '2024-01-06T17:00:00Z'
  },
  {
    id: '11',
    user_id: 'user1',
    date: '2024-02-20',
    description: 'Rent Payment',
    amount: -1200.00,
    type: 'EXPENSE',
    category_id: 'Housing',
    merchant: 'Landlord',
    notes: null,
    tags: null,
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-02-20T09:00:00Z'
  },
  {
    id: '12',
    user_id: 'user1',
    date: '2024-02-10',
    description: 'Restaurant Dinner',
    amount: -75.00,
    type: 'EXPENSE',
    category_id: 'Food & Dining',
    merchant: 'Fancy Eats',
    notes: null,
    tags: null,
    created_at: '2024-02-10T19:30:00Z',
    updated_at: '2024-02-10T19:30:00Z'
  },
  {
    id: '13',
    user_id: 'user1',
    date: '2024-02-05',
    description: 'Gym Membership',
    amount: -50.00,
    type: 'EXPENSE',
    category_id: 'Health & Fitness',
    merchant: 'Fitness Club',
    notes: null,
    tags: null,
    created_at: '2024-02-05T08:00:00Z',
    updated_at: '2024-02-05T08:00:00Z'
  }
]

// Generate additional mock data for different months
// Net Worth Data Types
export interface NetWorthData {
  date: string
  value: number
}

export type TimePeriod = "1W" | "1M" | "3M" | "YTD" | "1Y" | "3Y" | "5Y"

// Mock Net Worth Data
export const mockNetWorthData: Record<TimePeriod, NetWorthData[]> = {
  "1W": [
    { date: "Mon", value: 98500 },
    { date: "Tue", value: 99200 },
    { date: "Wed", value: 98800 },
    { date: "Thu", value: 100100 },
    { date: "Fri", value: 101500 },
    { date: "Sat", value: 102000 },
    { date: "Sun", value: 102300 },
  ],
  "1M": [
    { date: "Week 1", value: 95000 },
    { date: "Week 2", value: 97500 },
    { date: "Week 3", value: 99800 },
    { date: "Week 4", value: 102300 },
  ],
  "3M": [
    { date: "Jan", value: 85000 },
    { date: "Feb", value: 92000 },
    { date: "Mar", value: 102300 },
  ],
  "YTD": [
    { date: "Jan", value: 85000 },
    { date: "Feb", value: 92000 },
    { date: "Mar", value: 102300 },
  ],
  "1Y": [
    { date: "Q1", value: 75000 },
    { date: "Q2", value: 82000 },
    { date: "Q3", value: 95000 },
    { date: "Q4", value: 102300 },
  ],
  "3Y": [
    { date: "2022", value: 45000 },
    { date: "2023", value: 68000 },
    { date: "2024", value: 102300 },
  ],
  "5Y": [
    { date: "2020", value: 25000 },
    { date: "2021", value: 35000 },
    { date: "2022", value: 45000 },
    { date: "2023", value: 68000 },
    { date: "2024", value: 102300 },
  ],
}

// Asset Types
export interface AssetType {
  id: string
  name: string
  value: number
  percentage: number
  color: string
  change: number
  changePercentage: number
}

// Mock Assets Data
export const mockAssets: AssetType[] = [
  {
    id: "1",
    name: "Stocks & ETFs",
    value: 45000,
    percentage: 44,
    color: "#10b981",
    change: 2500,
    changePercentage: 5.9,
  },
  {
    id: "2",
    name: "Real Estate",
    value: 35000,
    percentage: 34,
    color: "#3b82f6",
    change: 1200,
    changePercentage: 3.6,
  },
  {
    id: "3",
    name: "Cash & Savings",
    value: 12000,
    percentage: 12,
    color: "#8b5cf6",
    change: -300,
    changePercentage: -2.4,
  },
  {
    id: "4",
    name: "Cryptocurrency",
    value: 8000,
    percentage: 8,
    color: "#f59e0b",
    change: 800,
    changePercentage: 11.1,
  },
  {
    id: "5",
    name: "Bonds",
    value: 2300,
    percentage: 2,
    color: "#ef4444",
    change: 100,
    changePercentage: 4.5,
  },
]

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
      type: 'INCOME',
      category_id: 'Income',
      merchant: 'Company Inc',
      notes: null,
      tags: null,
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
        type: 'EXPENSE',
        category_id: category,
        merchant: 'Various',
        notes: null,
        tags: null,
        created_at: expenseDate.toISOString(),
        updated_at: expenseDate.toISOString()
      })
    }
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}