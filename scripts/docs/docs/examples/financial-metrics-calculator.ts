import { Transaction, CategoryDB } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from 'date-fns'

/**
 * Financial Metrics Calculator
 * Provides functions to calculate and display key financial metrics from transaction data
 */

// Type definitions for our metrics
interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
  transactionCount: number
}

interface FinancialMetrics {
  totalIncome: number
  totalSpending: number
  netCashflow: number
  incomeByCategories: CategoryBreakdown[]
  spendingByCategories: CategoryBreakdown[]
  period: {
    startDate: string
    endDate: string
  }
}

// Helper function to format dates
function formatDate(date: Date): string {
  return format(date, 'MMM dd, yyyy')
}

/**
 * 1. Calculate Total Income
 * Sums all income transactions (positive amounts or INCOME type)
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  if (!transactions || transactions.length === 0) {
    return 0
  }

  return transactions
    .filter(transaction => 
      transaction.type === 'INCOME' || 
      (transaction.amount && transaction.amount > 0)
    )
    .reduce((total, transaction) => {
      const amount = transaction.amount || 0
      return total + Math.abs(amount) // Ensure positive value
    }, 0)
}

/**
 * 2. Calculate Total Spending
 * Sums all expense transactions (negative amounts or EXPENSE type)
 */
export function calculateTotalSpending(transactions: Transaction[]): number {
  if (!transactions || transactions.length === 0) {
    return 0
  }

  return transactions
    .filter(transaction => 
      transaction.type === 'EXPENSE' || 
      (transaction.amount && transaction.amount < 0)
    )
    .reduce((total, transaction) => {
      const amount = transaction.amount || 0
      return total + Math.abs(amount) // Convert to positive for spending total
    }, 0)
}

/**
 * 3. Calculate Income by Categories
 * Groups income transactions by category and calculates totals
 */
export function calculateIncomeByCategories(
  transactions: Transaction[],
  categories: CategoryDB[]
): CategoryBreakdown[] {
  if (!transactions || transactions.length === 0) {
    return []
  }

  // Filter income transactions
  const incomeTransactions = transactions.filter(transaction => 
    transaction.type === 'INCOME' || 
    (transaction.amount && transaction.amount > 0)
  )

  if (incomeTransactions.length === 0) {
    return []
  }

  // Calculate total income for percentage calculations
  const totalIncome = calculateTotalIncome(transactions)

  // Group by category
  const categoryMap = new Map<string, {
    amount: number
    count: number
    categoryName: string
  }>()

  incomeTransactions.forEach(transaction => {
    const categoryId = transaction.category_id || 'uncategorized'
    const amount = Math.abs(transaction.amount || 0)
    const category = categories.find(c => c.id === categoryId)
    const categoryName = category?.name || 'Uncategorized'

    if (categoryMap.has(categoryId)) {
      const existing = categoryMap.get(categoryId)!
      categoryMap.set(categoryId, {
        amount: existing.amount + amount,
        count: existing.count + 1,
        categoryName: existing.categoryName
      })
    } else {
      categoryMap.set(categoryId, {
        amount,
        count: 1,
        categoryName
      })
    }
  })

  // Convert to array and calculate percentages
  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      amount: data.amount,
      percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending
}

/**
 * 4. Calculate Spending by Categories
 * Groups expense transactions by category and calculates totals
 */
export function calculateSpendingByCategories(
  transactions: Transaction[],
  categories: CategoryDB[]
): CategoryBreakdown[] {
  if (!transactions || transactions.length === 0) {
    return []
  }

  // Filter expense transactions
  const expenseTransactions = transactions.filter(transaction => 
    transaction.type === 'EXPENSE' || 
    (transaction.amount && transaction.amount < 0)
  )

  if (expenseTransactions.length === 0) {
    return []
  }

  // Calculate total spending for percentage calculations
  const totalSpending = calculateTotalSpending(transactions)

  // Group by category
  const categoryMap = new Map<string, {
    amount: number
    count: number
    categoryName: string
  }>()

  expenseTransactions.forEach(transaction => {
    const categoryId = transaction.category_id || 'uncategorized'
    const amount = Math.abs(transaction.amount || 0)
    const category = categories.find(c => c.id === categoryId)
    const categoryName = category?.name || 'Uncategorized'

    if (categoryMap.has(categoryId)) {
      const existing = categoryMap.get(categoryId)!
      categoryMap.set(categoryId, {
        amount: existing.amount + amount,
        count: existing.count + 1,
        categoryName: existing.categoryName
      })
    } else {
      categoryMap.set(categoryId, {
        amount,
        count: 1,
        categoryName
      })
    }
  })

  // Convert to array and calculate percentages
  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      amount: data.amount,
      percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      transactionCount: data.count
    }))
    .sort((a, b) => b.amount - a.amount) // Sort by amount descending
}

/**
 * 5. Calculate Net Cashflow
 * Difference between total income and total spending
 */
export function calculateNetCashflow(transactions: Transaction[]): number {
  const totalIncome = calculateTotalIncome(transactions)
  const totalSpending = calculateTotalSpending(transactions)
  return totalIncome - totalSpending
}

/**
 * Filter transactions by date range (e.g., current month)
 */
export function filterTransactionsByMonth(
  transactions: Transaction[],
  date: Date = new Date()
): Transaction[] {
  if (!transactions || transactions.length === 0) {
    return []
  }

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)

  return transactions.filter(transaction => {
    if (!transaction.date) return false
    
    const transactionDate = typeof transaction.date === 'string' 
      ? parseISO(transaction.date) 
      : transaction.date
    
    return isWithinInterval(transactionDate, {
      start: monthStart,
      end: monthEnd
    })
  })
}

/**
 * Calculate all financial metrics for a given period
 */
export function calculateAllMetrics(
  transactions: Transaction[],
  categories: CategoryDB[],
  startDate?: Date,
  endDate?: Date
): FinancialMetrics {
  // Filter transactions by date range if provided
  let filteredTransactions = transactions
  
  if (startDate && endDate) {
    filteredTransactions = transactions.filter(transaction => {
      if (!transaction.date) return false
      
      const transactionDate = typeof transaction.date === 'string' 
        ? parseISO(transaction.date) 
        : transaction.date
      
      return isWithinInterval(transactionDate, {
        start: startDate,
        end: endDate
      })
    })
  } else if (startDate || endDate) {
    // Default to current month if only one date is provided
    const referenceDate = startDate || endDate || new Date()
    filteredTransactions = filterTransactionsByMonth(transactions, referenceDate)
  }

  const totalIncome = calculateTotalIncome(filteredTransactions)
  const totalSpending = calculateTotalSpending(filteredTransactions)
  const netCashflow = totalIncome - totalSpending
  const incomeByCategories = calculateIncomeByCategories(filteredTransactions, categories)
  const spendingByCategories = calculateSpendingByCategories(filteredTransactions, categories)

  // Determine period dates
  const periodStart = startDate || startOfMonth(new Date())
  const periodEnd = endDate || endOfMonth(new Date())

  return {
    totalIncome,
    totalSpending,
    netCashflow,
    incomeByCategories,
    spendingByCategories,
    period: {
      startDate: formatDate(periodStart),
      endDate: formatDate(periodEnd)
    }
  }
}

/**
 * Display financial metrics in a formatted way
 */
export function displayFinancialMetrics(metrics: FinancialMetrics): string {
  const {
    totalIncome,
    totalSpending,
    netCashflow,
    incomeByCategories,
    spendingByCategories,
    period
  } = metrics

  let output = `\n=== FINANCIAL METRICS (${period.startDate} to ${period.endDate}) ===\n\n`
  
  // Summary metrics
  output += `📊 SUMMARY:\n`
  output += `   Total Income:    ${formatCurrency(totalIncome)}\n`
  output += `   Total Spending:  ${formatCurrency(totalSpending)}\n`
  output += `   Net Cashflow:    ${formatCurrency(netCashflow)} ${netCashflow >= 0 ? '✅' : '⚠️'}\n\n`
  
  // Income breakdown
  if (incomeByCategories.length > 0) {
    output += `💰 INCOME BY CATEGORIES:\n`
    incomeByCategories.forEach(category => {
      output += `   ${category.categoryName.padEnd(20)} ${formatCurrency(category.amount).padStart(12)} (${category.percentage.toFixed(1)}%) [${category.transactionCount} transactions]\n`
    })
    output += `\n`
  } else {
    output += `💰 INCOME BY CATEGORIES: No income transactions found\n\n`
  }
  
  // Spending breakdown
  if (spendingByCategories.length > 0) {
    output += `💸 SPENDING BY CATEGORIES:\n`
    spendingByCategories.forEach(category => {
      output += `   ${category.categoryName.padEnd(20)} ${formatCurrency(category.amount).padStart(12)} (${category.percentage.toFixed(1)}%) [${category.transactionCount} transactions]\n`
    })
    output += `\n`
  } else {
    output += `💸 SPENDING BY CATEGORIES: No expense transactions found\n\n`
  }
  
  return output
}

/**
 * Example usage function
 */
export function exampleUsage() {
  // Example transaction data
  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      amount: 5000,
      type: 'INCOME',
      category_id: 'salary',
      description: 'Monthly Salary',
      date: '2024-01-15',
      user_id: 'user1',
      merchant: null,
      notes: null,
      tags: null,
      is_recurring: false,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      amount: -1200,
      type: 'EXPENSE',
      category_id: 'rent',
      description: 'Monthly Rent',
      date: '2024-01-01',
      user_id: 'user1',
      merchant: 'Property Management',
      notes: null,
      tags: null,
      is_recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      amount: -300,
      type: 'EXPENSE',
      category_id: 'groceries',
      description: 'Weekly Groceries',
      date: '2024-01-10',
      user_id: 'user1',
      merchant: 'Supermarket',
      notes: null,
      tags: ['food', 'weekly'],
      is_recurring: false,
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z'
    },
    {
      id: '4',
      amount: 500,
      type: 'INCOME',
      category_id: 'freelance',
      description: 'Freelance Project',
      date: '2024-01-20',
      user_id: 'user1',
      merchant: null,
      notes: 'Web development project',
      tags: ['freelance', 'web'],
      is_recurring: false,
      created_at: '2024-01-20T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z'
    }
  ]

  // Example category data
  const sampleCategories: CategoryDB[] = [
    {
      id: 'salary',
      name: 'Salary',
      color: '#4CAF50',
      group_type: 'INCOME',
      category_group_id: 'income-group',
      user_id: 'user1',
      is_custom: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'freelance',
      name: 'Freelance',
      color: '#2196F3',
      group_type: 'INCOME',
      category_group_id: 'income-group',
      user_id: 'user1',
      is_custom: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'rent',
      name: 'Rent',
      color: '#F44336',
      group_type: 'EXPENSE',
      category_group_id: 'expense-group',
      user_id: 'user1',
      is_custom: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'groceries',
      name: 'Groceries',
      color: '#FF9800',
      group_type: 'EXPENSE',
      category_group_id: 'expense-group',
      user_id: 'user1',
      is_custom: false,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  // Calculate all metrics
  const metrics = calculateAllMetrics(sampleTransactions, sampleCategories)
  
  // Display results
  console.log(displayFinancialMetrics(metrics))
  
  // Individual calculations
  console.log('Individual Calculations:')
  console.log('Total Income:', formatCurrency(calculateTotalIncome(sampleTransactions)))
  console.log('Total Spending:', formatCurrency(calculateTotalSpending(sampleTransactions)))
  console.log('Net Cashflow:', formatCurrency(calculateNetCashflow(sampleTransactions)))
  
  return metrics
}

// Edge case handling examples
export function handleEdgeCases() {
  console.log('\n=== EDGE CASE TESTING ===\n')
  
  // Empty dataset
  const emptyMetrics = calculateAllMetrics([], [])
  console.log('Empty Dataset:')
  console.log(displayFinancialMetrics(emptyMetrics))
  
  // Transactions with missing amounts
  const incompleteTransactions: Transaction[] = [
    {
      id: '1',
      amount: 0, // Handle as zero instead of undefined
      type: 'INCOME',
      category_id: 'salary',
      description: 'Incomplete Transaction',
      date: '2024-01-15',
      user_id: 'user1',
      merchant: null,
      notes: null,
      tags: null,
      is_recurring: false,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    }
  ]
  
  const incompleteMetrics = calculateAllMetrics(incompleteTransactions, [])
  console.log('Incomplete Data:')
  console.log(displayFinancialMetrics(incompleteMetrics))
  
  // Transactions with missing categories
  const uncategorizedTransactions: Transaction[] = [
    {
      id: '1',
      amount: 1000,
      type: 'INCOME',
      category_id: '', // Handle as empty string instead of undefined
      description: 'Uncategorized Income',
      date: '2024-01-15',
      user_id: 'user1',
      merchant: null,
      notes: null,
      tags: null,
      is_recurring: false,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    }
  ]
  
  const uncategorizedMetrics = calculateAllMetrics(uncategorizedTransactions, [])
  console.log('Uncategorized Transactions:')
  console.log(displayFinancialMetrics(uncategorizedMetrics))
}