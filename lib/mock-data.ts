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
    account_id: null,
    merchant: 'Whole Foods',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-15',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Shell',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-14',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Company Inc',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-13',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Netflix',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-12',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Electric Company',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-11',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Starbucks',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-10',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Amazon',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-09',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Medical Center',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-08',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Uber',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-07',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Client ABC',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-06',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Landlord',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-02-20',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Fancy Eats',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-02-10',
    is_duplicate: false,
    duplicate_of: null,
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
    account_id: null,
    merchant: 'Fitness Club',
    notes: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    statement_id: null,
    raw_data: null,
    posting_date: '2024-02-05',
    is_duplicate: false,
    duplicate_of: null,
    created_at: '2024-02-05T08:00:00Z',
    updated_at: '2024-02-05T08:00:00Z'
  }
]

// Net worth data for charts
export interface NetWorthData {
  date: string
  value: number
}

export type TimePeriod = "1W" | "1M" | "3M" | "YTD" | "1Y" | "3Y" | "5Y" | "ALL"

// Mock net worth data for different time periods
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
  "ALL": [
    { date: "2019", value: 15000 },
    { date: "2020", value: 25000 },
    { date: "2021", value: 35000 },
    { date: "2022", value: 45000 },
    { date: "2023", value: 68000 },
    { date: "2024", value: 88978 },
  ],
}

// Asset allocation data
export interface AssetType {
  id: string
  name: string
  value: number
  percentage: number
  color: string
  change: number
  changePercentage: number
}

// Mock asset allocation data
export const mockAssets: AssetType[] = [
  {
    id: "1",
    name: "Stocks & ETFs",
    value: 45000,
    percentage: 44,
    color: "hsl(var(--chart-1))",
    change: 2500,
    changePercentage: 5.9,
  },
  {
    id: "2",
    name: "Real Estate",
    value: 35000,
    percentage: 34,
    color: "hsl(var(--chart-2))",
    change: 1200,
    changePercentage: 3.6,
  },
  {
    id: "3",
    name: "Cash & Savings",
    value: 12000,
    percentage: 12,
    color: "hsl(var(--chart-3))",
    change: -300,
    changePercentage: -2.4,
  },
  {
    id: "4",
    name: "Cryptocurrency",
    value: 8000,
    percentage: 8,
    color: "hsl(var(--chart-4))",
    change: 800,
    changePercentage: 11.1,
  },
  {
    id: "5",
    name: "Bonds",
    value: 2300,
    percentage: 2,
    color: "hsl(var(--chart-5))",
    change: 100,
    changePercentage: 4.5,
  },
]

// Detailed account data for the new design
export interface AccountItem {
  id: string
  name: string
  value: number
  percentage: number
  color: string
  change: number
  changePercentage: number
  addedTime: string
  icon?: string
}

export interface AccountCategory {
  name: string
  totalValue: number
  percentage: number
  accounts: AccountItem[]
}

// Mock detailed accounts data matching the design
export const mockDetailedAccounts: AccountCategory[] = [
  {
    name: "Cash",
    totalValue: 3000,
    percentage: 2,
    accounts: [
      {
        id: "cash-1",
        name: "Wio",
        value: 3000,
        percentage: 2,
        color: "hsl(var(--success))",
        change: 0,
        changePercentage: 0,
        addedTime: "Added 2 months ago",
        icon: "💳"
      },
      {
        id: "cash-2", 
        name: "Manual-My Bank",
        value: 0,
        percentage: 0,
        color: "hsl(var(--muted-foreground))",
        change: 0,
        changePercentage: 0,
        addedTime: "Added 2 months ago",
        icon: "🏦"
      }
    ]
  },
  {
    name: "Investments",
    totalValue: 10978,
    percentage: 7,
    accounts: [
      {
        id: "invest-1",
        name: "Etoro",
        value: 10694,
        percentage: 7,
        color: "hsl(var(--chart-1))",
        change: 1694,
        changePercentage: 1.69,
        addedTime: "Added 1 minute ago",
        icon: "📈"
      },
      {
        id: "invest-2",
        name: "Wio Crypto",
        value: 284,
        percentage: 0,
        color: "hsl(var(--chart-4))",
        change: -47,
        changePercentage: -5.47,
        addedTime: "Added 1 minute ago",
        icon: "₿"
      },
      {
        id: "invest-3",
        name: "RHB security",
        value: 0,
        percentage: 0,
        color: "hsl(var(--muted-foreground))",
        change: 0,
        changePercentage: 0,
        addedTime: "Added 1 month ago",
        icon: "🏛️"
      }
    ]
  },
  {
    name: "Real Estate",
    totalValue: 130000,
    percentage: 80,
    accounts: [
      {
        id: "realestate-1",
        name: "Rumah Cinere",
        value: 130000,
        percentage: 80,
        color: "hsl(var(--chart-5))",
        change: 0,
        changePercentage: 0,
        addedTime: "",
        icon: "🏠"
      }
    ]
  },
  {
    name: "Other",
    totalValue: 18000,
    percentage: 11,
    accounts: [
      {
        id: "other-1",
        name: "CX5 2015",
        value: 10000,
        percentage: 6,
        color: "hsl(var(--destructive))",
        change: 0,
        changePercentage: 0,
        addedTime: "",
        icon: "🚗"
      },
      {
        id: "other-2",
        name: "Q50",
        value: 8000,
        percentage: 5,
        color: "hsl(var(--chart-3))",
        change: 0,
        changePercentage: 0,
        addedTime: "",
        icon: "🚗"
      }
    ]
  }
]

// Mock liabilities data
export interface LiabilityItem {
  id: string
  name: string
  value: number
  percentage: number
  color: string
}

export const mockLiabilities: LiabilityItem[] = [
  {
    id: "liability-1",
    name: "Mortgages",
    value: 73000,
    percentage: 100,
    color: "hsl(var(--chart-5))"
  }
]

// Calculate total net worth from all accounts and liabilities
export const calculateNetWorth = (): number => {
  const totalAssets = mockDetailedAccounts.reduce((total, category) => 
    total + category.totalValue, 0
  )
  const totalLiabilities = mockLiabilities.reduce((total, liability) => 
    total + liability.value, 0
  )
  return totalAssets - totalLiabilities
}

export const generateMockTransactions = (months: number = 10): Transaction[] => {
  const transactions: Transaction[] = []
  const categories = Object.keys(CATEGORIES)
  const merchants = ['Amazon', 'Starbucks', 'Shell', 'Whole Foods', 'Netflix', 'Uber', 'Target', 'McDonald\'s']
  
  for (let month = 0; month < months; month++) {
    const transactionsPerMonth = Math.floor(Math.random() * 20) + 10 // 10-30 transactions per month
    
    for (let i = 0; i < transactionsPerMonth; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - month)
      date.setDate(Math.floor(Math.random() * 28) + 1)
      
      const isIncome = Math.random() < 0.1 // 10% chance of income
      const amount = isIncome 
        ? Math.floor(Math.random() * 3000) + 500 // Income: $500-$3500
        : -(Math.floor(Math.random() * 200) + 10) // Expense: $10-$210
      
      const category = categories[Math.floor(Math.random() * categories.length)]
      const merchant = merchants[Math.floor(Math.random() * merchants.length)]
      
      transactions.push({
        id: `generated-${month}-${i}`,
        user_id: 'user1',
        date: date.toISOString().split('T')[0],
        description: isIncome ? 'Salary' : `Purchase at ${merchant}`,
        amount,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        category_id: category,
        account_id: null,
        merchant: isIncome ? 'Company Inc' : merchant,
        notes: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        recurring_end_date: null,
        last_processed_date: null,
        statement_id: null,
        raw_data: null,
        posting_date: date.toISOString().split('T')[0],
        is_duplicate: false,
        duplicate_of: null,
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      })
    }
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
