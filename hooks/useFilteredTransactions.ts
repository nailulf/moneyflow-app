import { useMemo } from 'react'
import { Transaction } from '@/types/database'
import { getTransactionsByDateRange } from '@/lib/budget-utils'
import { getMonthlySpending, getMonthlyIncome, getCategoryBreakdown } from '@/lib/data-utils'

export function useFilteredTransactions(
  transactions: Transaction[],
  timeRange: 'monthly' | 'yearly',
  selectedYear: number,
  selectedMonth: number
) {
  // Get filtered transactions based on time range
  const filteredTransactions = useMemo(() => {
    return getTransactionsByDateRange(
      transactions,
      timeRange,
      selectedYear,
      selectedMonth
    )
  }, [transactions, timeRange, selectedYear, selectedMonth])

  // Calculate financial metrics
  const monthlyIncome = useMemo(() => {
    if (timeRange === 'monthly') {
      return getMonthlyIncome(filteredTransactions, new Date(selectedYear, selectedMonth - 1))
    }
    // For yearly, sum all income transactions
    return filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }, [filteredTransactions, timeRange, selectedYear, selectedMonth])

  const monthlySpending = useMemo(() => {
    if (timeRange === 'monthly') {
      return getMonthlySpending(filteredTransactions, new Date(selectedYear, selectedMonth - 1))
    }
    // For yearly, sum all expense transactions
    return filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }, [filteredTransactions, timeRange, selectedYear, selectedMonth])

  const netCashFlow = useMemo(() => {
    return monthlyIncome - monthlySpending
  }, [monthlyIncome, monthlySpending])

  const categoryBreakdownData = useMemo(() => {
    return getCategoryBreakdown(filteredTransactions)
  }, [filteredTransactions])

  return {
    filteredTransactions,
    monthlyIncome,
    monthlySpending,
    netCashFlow,
    categoryBreakdownData
  }
}