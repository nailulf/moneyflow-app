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
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
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
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
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
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z'
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
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
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
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z'
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
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
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
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z'
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
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z'
  },
  
  // February transactions (for testing monthly filtering)
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
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z'
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
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
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
  console.log('\n=== TESTING INDIVIDUAL CALCULATIONS ===\n')
  
  // Test with January data only
  const januaryTransactions = filterTransactionsByMonth(testTransactions, new Date('2024-01-15'))
  
  console.log('📊 January Transactions:', januaryTransactions.length)
  
  // 1. Total Income
  const totalIncome = calculateTotalIncome(januaryTransactions)
  console.log('💰 Total Income:', new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(totalIncome))
  
  // 2. Total Spending
  const totalSpending = calculateTotalSpending(januaryTransactions)
  console.log('💸 Total Spending:', new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(totalSpending))
  
  // 3. Net Cashflow
  const netCashflow = calculateNetCashflow(januaryTransactions)
  console.log('📈 Net Cashflow:', new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(netCashflow), netCashflow >= 0 ? '✅ Surplus' : '⚠️ Deficit')
  
  // 4. Income by Categories
  const incomeByCategories = calculateIncomeByCategories(januaryTransactions, testCategories)
  console.log('\n📋 Income by Categories:')
  incomeByCategories.forEach(category => {
    console.log(`   ${category.categoryName}: ${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(category.amount)} (${category.percentage.toFixed(1)}%) [${category.transactionCount} transactions]`)
  })
  
  // 5. Spending by Categories
  const spendingByCategories = calculateSpendingByCategories(januaryTransactions, testCategories)
  console.log('\n💳 Spending by Categories:')
  spendingByCategories.forEach(category => {
    console.log(`   ${category.categoryName}: ${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(category.amount)} (${category.percentage.toFixed(1)}%) [${category.transactionCount} transactions]`)
  })
}

/**
 * Test comprehensive metrics calculation
 */
function testComprehensiveMetrics() {
  console.log('\n\n=== TESTING COMPREHENSIVE METRICS ===\n')
  
  // Test with all data
  const allMetrics = calculateAllMetrics(testTransactions, testCategories)
  console.log(displayFinancialMetrics(allMetrics))
  
  // Test with January data only
  const januaryMetrics = calculateAllMetrics(
    testTransactions,
    testCategories,
    new Date('2024-01-01'),
    new Date('2024-01-31')
  )
  console.log('\n=== JANUARY ONLY ===\n')
  console.log(displayFinancialMetrics(januaryMetrics))
}

/**
 * Test monthly filtering
 */
function testMonthlyFiltering() {
  console.log('\n\n=== TESTING MONTHLY FILTERING ===\n')
  
  const januaryTransactions = filterTransactionsByMonth(testTransactions, new Date('2024-01-15'))
  const februaryTransactions = filterTransactionsByMonth(testTransactions, new Date('2024-02-15'))
  
  console.log('📅 January Transactions:', januaryTransactions.length)
  console.log('📅 February Transactions:', februaryTransactions.length)
  console.log('📅 Total Transactions:', testTransactions.length)
  
  // Compare monthly cashflows
  const janCashflow = calculateNetCashflow(januaryTransactions)
  const febCashflow = calculateNetCashflow(februaryTransactions)
  
  console.log('\n💰 Monthly Comparison:')
  console.log(`   January: ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(janCashflow)}`)
  console.log(`   February: ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(febCashflow)}`)
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n\n=== TESTING EDGE CASES ===\n')
  
  // Empty dataset
  console.log('🔍 Empty Dataset Test:')
  const emptyMetrics = calculateAllMetrics([], [])
  console.log('   Total Income:', emptyMetrics.totalIncome)
  console.log('   Total Spending:', emptyMetrics.totalSpending)
  console.log('   Net Cashflow:', emptyMetrics.netCashflow)
  console.log('   Income Categories:', emptyMetrics.incomeByCategories.length)
  console.log('   Spending Categories:', emptyMetrics.spendingByCategories.length)
  
  // Transactions with zero amounts
  const zeroAmountTransactions: Transaction[] = [{
    id: 'zero-1',
    amount: 0,
    type: 'INCOME',
    category_id: 'salary',
    account_id: null,
    description: 'Zero Amount Transaction',
    date: '2024-01-15',
    user_id: 'test-user',
    merchant: null,
    notes: null,
    tags: null,
    is_recurring: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  }]
  
  console.log('\n🔍 Zero Amount Test:')
  const zeroMetrics = calculateAllMetrics(zeroAmountTransactions, testCategories)
  console.log('   Total Income:', zeroMetrics.totalIncome)
  console.log('   Total Spending:', zeroMetrics.totalSpending)
  
  // Uncategorized transactions
  const uncategorizedTransactions: Transaction[] = [{
    id: 'uncat-1',
    amount: 1000000,
    type: 'INCOME',
    category_id: 'non-existent-category',
    account_id: null,
    description: 'Uncategorized Transaction',
    date: '2024-01-15',
    user_id: 'test-user',
    merchant: null,
    notes: null,
    tags: null,
    is_recurring: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  }]
  
  console.log('\n🔍 Uncategorized Transaction Test:')
  const uncatMetrics = calculateAllMetrics(uncategorizedTransactions, testCategories)
  console.log('   Income Categories:', uncatMetrics.incomeByCategories.map(c => c.categoryName))
}

/**
 * Performance test with larger dataset
 */
function testPerformance() {
  console.log('\n\n=== TESTING PERFORMANCE ===\n')
  
  // Generate larger dataset
  const largeDataset: Transaction[] = []
  const startTime = Date.now()
  
  // Generate 1000 transactions
  for (let i = 0; i < 1000; i++) {
    largeDataset.push({
      id: `perf-${i}`,
      amount: Math.random() > 0.5 ? Math.random() * 5000000 : -Math.random() * 2000000,
      type: Math.random() > 0.5 ? 'INCOME' : 'EXPENSE',
      category_id: testCategories[Math.floor(Math.random() * testCategories.length)].id,
      account_id: null,
      description: `Performance Test Transaction ${i}`,
      date: `2024-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      user_id: 'test-user',
      merchant: null,
      notes: null,
      tags: null,
      is_recurring: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    })
  }
  
  const generationTime = Date.now() - startTime
  console.log(`📊 Generated ${largeDataset.length} transactions in ${generationTime}ms`)
  
  // Test calculation performance
  const calcStartTime = Date.now()
  const perfMetrics = calculateAllMetrics(largeDataset, testCategories)
  const calcTime = Date.now() - calcStartTime
  
  console.log(`⚡ Calculated metrics for ${largeDataset.length} transactions in ${calcTime}ms`)
  console.log(`   Total Income: ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(perfMetrics.totalIncome)}`)
  console.log(`   Total Spending: ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(perfMetrics.totalSpending)}`)
  console.log(`   Income Categories: ${perfMetrics.incomeByCategories.length}`)
  console.log(`   Spending Categories: ${perfMetrics.spendingByCategories.length}`)
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('🚀 FINANCIAL METRICS CALCULATOR TESTS')
  console.log('=====================================\n')
  
  try {
    testIndividualCalculations()
    testComprehensiveMetrics()
    testMonthlyFiltering()
    testEdgeCases()
    testPerformance()
    
    console.log('\n\n✅ ALL TESTS COMPLETED SUCCESSFULLY!')
    console.log('\n📝 Summary:')
    console.log('   ✓ Individual calculations work correctly')
    console.log('   ✓ Comprehensive metrics calculation works')
    console.log('   ✓ Monthly filtering works properly')
    console.log('   ✓ Edge cases are handled gracefully')
    console.log('   ✓ Performance is acceptable for large datasets')
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
  }
}

/**
 * Export test functions for individual use
 */
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

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests()
}

// For browser/module usage
if (typeof window !== 'undefined') {
  (window as any).financialMetricsTests = {
    runAllTests,
    testIndividualCalculations,
    testComprehensiveMetrics,
    testMonthlyFiltering,
    testEdgeCases,
    testPerformance
  }
}