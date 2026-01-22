/**
 * Test script to demonstrate financial metrics calculations
 * Run this file to see the calculations in action with sample data
 */

import {
  calculateTotalIncome,
  calculateTotalSpending,
  calculateIncomeByCategories,
  calculateSpendingByCategories,
  calculateNetCashflow,
  calculateAllMetrics,
  filterTransactionsByMonth,
  displayFinancialMetrics,
  exampleUsage,
  handleEdgeCases
} from './financial-metrics-calculator'
import { Transaction, CategoryDB } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'

/**
 * Sample data for testing
 */
const testTransactions: Transaction[] = [
  // January Income
  {
    id: '1',
    amount: 8000000, // 8M IDR salary
    type: 'INCOME',
    category_id: 'salary',
    account_id: null,
    description: 'Monthly Salary - January',
    date: '2024-01-15',
    user_id: 'test-user',
    merchant: null,
    notes: 'Regular monthly salary',
    tags: ['salary', 'monthly'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-15',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '2',
    amount: 2000000, // 2M IDR freelance
    type: 'INCOME',
    category_id: 'freelance',
    account_id: null,
    description: 'Web Development Project',
    date: '2024-01-20',
    user_id: 'test-user',
    merchant: null,
    notes: 'Client project completion',
    tags: ['freelance', 'web-dev'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-20',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '3',
    amount: 500000, // 500K IDR investment returns
    type: 'INCOME',
    category_id: 'investment',
    account_id: null,
    description: 'Stock Dividends',
    date: '2024-01-25',
    user_id: 'test-user',
    merchant: null,
    notes: 'Quarterly dividend payment',
    tags: ['investment', 'dividends'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-25',
    is_duplicate: false,
    duplicate_of: null
  },
  
  // January Expenses
  {
    id: '4',
    amount: -2500000, // 2.5M IDR rent
    type: 'EXPENSE',
    category_id: 'housing',
    account_id: null,
    description: 'Monthly Rent',
    date: '2024-01-01',
    user_id: 'test-user',
    merchant: 'Property Management Co.',
    notes: 'Monthly apartment rent',
    tags: ['housing', 'rent'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-01',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '5',
    amount: -1200000, // 1.2M IDR groceries
    type: 'EXPENSE',
    category_id: 'food',
    account_id: null,
    description: 'Weekly Groceries',
    date: '2024-01-05',
    user_id: 'test-user',
    merchant: 'Supermarket ABC',
    notes: 'Weekly grocery shopping',
    tags: ['food', 'groceries'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-05',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '6',
    amount: -800000, // 800K IDR utilities
    type: 'EXPENSE',
    category_id: 'utilities',
    account_id: null,
    description: 'Electricity & Water Bill',
    date: '2024-01-10',
    user_id: 'test-user',
    merchant: 'PLN & PDAM',
    notes: 'Monthly utility bills',
    tags: ['utilities', 'bills'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-10',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '7',
    amount: -600000, // 600K IDR transportation
    type: 'EXPENSE',
    category_id: 'transport',
    account_id: null,
    description: 'Monthly Transport Pass',
    date: '2024-01-12',
    user_id: 'test-user',
    merchant: 'TransJakarta',
    notes: 'Monthly public transport pass',
    tags: ['transport', 'public'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-12',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '8',
    amount: -400000, // 400K IDR entertainment
    type: 'EXPENSE',
    category_id: 'entertainment',
    account_id: null,
    description: 'Movie & Dining Out',
    date: '2024-01-18',
    user_id: 'test-user',
    merchant: 'Cinema XXI & Restaurant',
    notes: 'Weekend entertainment',
    tags: ['entertainment', 'leisure'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-01-18',
    is_duplicate: false,
    duplicate_of: null
  },
  
  // February Income
  {
    id: '9',
    amount: 8000000, // 8M IDR salary
    type: 'INCOME',
    category_id: 'salary',
    account_id: null,
    description: 'Monthly Salary - February',
    date: '2024-02-15',
    user_id: 'test-user',
    merchant: null,
    notes: 'Regular monthly salary',
    tags: ['salary', 'monthly'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-02-15',
    is_duplicate: false,
    duplicate_of: null
  },
  {
    id: '10',
    amount: -2500000, // 2.5M IDR rent
    type: 'EXPENSE',
    category_id: 'housing',
    account_id: null,
    description: 'Monthly Rent',
    date: '2024-02-01',
    user_id: 'test-user',
    merchant: 'Property Management Co.',
    notes: 'Monthly apartment rent',
    tags: ['housing', 'rent'],
    is_recurring: false,
    recurring_frequency: null,
    recurring_end_date: null,
    last_processed_date: null,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    statement_id: null,
    raw_data: null,
    posting_date: '2024-02-01',
    is_duplicate: false,
    duplicate_of: null
  }
]

const testCategories: CategoryDB[] = [
  // Income Categories
  {
    id: 'salary',
    name: 'Salary',
    color: '#4CAF50',
    group_type: 'INCOME',
    category_group_id: 'income-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'freelance',
    name: 'Freelance Work',
    color: '#2196F3',
    group_type: 'INCOME',
    category_group_id: 'income-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'investment',
    name: 'Investment Returns',
    color: '#9C27B0',
    group_type: 'INCOME',
    category_group_id: 'income-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  // Expense Categories
  {
    id: 'housing',
    name: 'Housing & Rent',
    color: '#F44336',
    group_type: 'EXPENSE',
    category_group_id: 'expense-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'food',
    name: 'Food & Groceries',
    color: '#FF9800',
    group_type: 'EXPENSE',
    category_group_id: 'expense-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    color: '#607D8B',
    group_type: 'EXPENSE',
    category_group_id: 'expense-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'transport',
    name: 'Transportation',
    color: '#795548',
    group_type: 'EXPENSE',
    category_group_id: 'expense-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#E91E63',
    group_type: 'EXPENSE',
    category_group_id: 'expense-group',
    user_id: 'test-user',
    is_custom: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

/**
 * Test individual calculation functions
 */
function testIndividualCalculations() {
  console.log('=== TESTING INDIVIDUAL CALCULATIONS ===\n')
  
  const totalIncome = calculateTotalIncome(testTransactions)
  const totalSpending = calculateTotalSpending(testTransactions)
  const netCashflow = calculateNetCashflow(testTransactions)
  
  console.log(`Total Income: ${formatCurrency(totalIncome)}`)
  console.log(`Total Spending: ${formatCurrency(Math.abs(totalSpending))}`)
  console.log(`Net Cashflow: ${formatCurrency(netCashflow)}`)
  
  // Test category breakdowns
  const incomeByCategories = calculateIncomeByCategories(testTransactions, testCategories)
  const spendingByCategories = calculateSpendingByCategories(testTransactions, testCategories)
  
  console.log('\nIncome by Categories:')
  incomeByCategories.forEach(category => {
    console.log(`  ${category.categoryName}: ${formatCurrency(category.amount)} (${category.percentage.toFixed(1)}%)`)
  })
  
  console.log('\nSpending by Categories:')
  spendingByCategories.forEach(category => {
    console.log(`  ${category.categoryName}: ${formatCurrency(Math.abs(category.amount))} (${category.percentage.toFixed(1)}%)`)
  })
  
  console.log('\n' + '='.repeat(50) + '\n')
}

/**
 * Test comprehensive metrics calculation
 */
function testComprehensiveMetrics() {
  console.log('=== TESTING COMPREHENSIVE METRICS ===\n')
  
  const metrics = calculateAllMetrics(testTransactions, testCategories)
  console.log(displayFinancialMetrics(metrics))
  
  console.log('\n' + '='.repeat(50) + '\n')
}

/**
 * Test monthly filtering
 */
function testMonthlyFiltering() {
  console.log('=== TESTING MONTHLY FILTERING ===\n')
  
  // Test January 2024
  const januaryTransactions = filterTransactionsByMonth(testTransactions, new Date('2024-01-15'))
  console.log(`January 2024 Transactions: ${januaryTransactions.length}`)
  
  const januaryMetrics = calculateAllMetrics(januaryTransactions, testCategories)
  console.log('January 2024 Metrics:')
  console.log(displayFinancialMetrics(januaryMetrics))
  
  // Test February 2024
  const februaryTransactions = filterTransactionsByMonth(testTransactions, new Date('2024-02-15'))
  console.log(`\nFebruary 2024 Transactions: ${februaryTransactions.length}`)
  
  const februaryMetrics = calculateAllMetrics(februaryTransactions, testCategories)
  console.log('February 2024 Metrics:')
  console.log(displayFinancialMetrics(februaryMetrics))
  
  console.log('\n' + '='.repeat(50) + '\n')
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('=== TESTING EDGE CASES ===\n')
  
  // Test with empty data
  console.log('Empty Dataset Test:')
  const emptyMetrics = calculateAllMetrics([], [])
  console.log(displayFinancialMetrics(emptyMetrics))
  
  // Test with only income
  const incomeOnlyTransactions = testTransactions.filter(t => t.type === 'INCOME')
  console.log('\nIncome Only Test:')
  const incomeOnlyMetrics = calculateAllMetrics(incomeOnlyTransactions, testCategories)
  console.log(displayFinancialMetrics(incomeOnlyMetrics))
  
  // Test with only expenses
  const expenseOnlyTransactions = testTransactions.filter(t => t.type === 'EXPENSE')
  console.log('\nExpense Only Test:')
  const expenseOnlyMetrics = calculateAllMetrics(expenseOnlyTransactions, testCategories)
  console.log(displayFinancialMetrics(expenseOnlyMetrics))
  
  // Test with missing categories
  console.log('\nMissing Categories Test:')
  const missingCategoriesMetrics = calculateAllMetrics(testTransactions, [])
  console.log(displayFinancialMetrics(missingCategoriesMetrics))
  
  console.log('\n' + '='.repeat(50) + '\n')
}

/**
 * Test performance with larger dataset
 */
function testPerformance() {
  console.log('=== TESTING PERFORMANCE ===\n')
  
  // Generate larger dataset
  const largeTransactionSet: Transaction[] = []
  for (let i = 0; i < 1000; i++) {
    largeTransactionSet.push({
      id: `perf-${i}`,
      amount: Math.random() > 0.5 ? Math.floor(Math.random() * 5000000) : -Math.floor(Math.random() * 2000000),
      type: Math.random() > 0.5 ? 'INCOME' : 'EXPENSE',
      category_id: testCategories[Math.floor(Math.random() * testCategories.length)].id,
      account_id: null,
      description: `Performance Test Transaction ${i}`,
      date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      user_id: 'test-user',
      merchant: Math.random() > 0.5 ? `Merchant ${i}` : null,
      notes: null,
      tags: null,
      is_recurring: false,
      recurring_frequency: null,
      recurring_end_date: null,
      last_processed_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      statement_id: null,
      raw_data: null,
      posting_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      is_duplicate: false,
      duplicate_of: null
    })
  }
  
  console.log(`Testing with ${largeTransactionSet.length} transactions...`)
  
  const startTime = performance.now()
  const performanceMetrics = calculateAllMetrics(largeTransactionSet, testCategories)
  const endTime = performance.now()
  
  console.log(`Calculation completed in ${(endTime - startTime).toFixed(2)}ms`)
  console.log(`Total Income: ${formatCurrency(performanceMetrics.totalIncome)}`)
  console.log(`Total Spending: ${formatCurrency(Math.abs(performanceMetrics.totalSpending))}`)
  console.log(`Net Cashflow: ${formatCurrency(performanceMetrics.netCashflow)}`)
  
  console.log('\n' + '='.repeat(50) + '\n')
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧮 FINANCIAL METRICS CALCULATOR - COMPREHENSIVE TESTING\n')
  console.log('='.repeat(60))
  
  testIndividualCalculations()
  testComprehensiveMetrics()
  testMonthlyFiltering()
  testEdgeCases()
  testPerformance()
  
  console.log('✅ All tests completed successfully!')
  console.log('\nTo run the example usage from the calculator, call exampleUsage()')
  console.log('To test edge cases from the calculator, call handleEdgeCases()')
}

// Export functions for external use
export {
  testIndividualCalculations,
  testComprehensiveMetrics,
  testMonthlyFiltering,
  testEdgeCases,
  testPerformance,
  runAllTests,
  testTransactions,
  testCategories
}

// Run tests if this file is executed directly (Node.js)
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests()
}

// Run tests if this file is loaded in browser
if (typeof window !== 'undefined') {
  console.log('Financial Metrics Test Suite loaded. Call runAllTests() to execute all tests.')
  // Optionally auto-run: runAllTests()
}
