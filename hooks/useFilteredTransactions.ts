import { useMemo } from 'react'
import { Transaction } from '@/types/database'
import { getTransactionsByDateRange } from '@/lib/budget-utils'
import { getMonthlySpending, getMonthlyIncome, getCategoryBreakdown, calculateTotalSpending, calculateTotalIncome } from '@/lib/data-utils'

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
    // Use the utility function instead of inline logic
    return calculateTotalIncome(filteredTransactions)
  }, [filteredTransactions, timeRange, selectedYear, selectedMonth])

  const monthlySpending = useMemo(() => {
    if (timeRange === 'monthly') {
      return getMonthlySpending(filteredTransactions, new Date(selectedYear, selectedMonth - 1))
    }
    // Use the utility function instead of inline logic
    return calculateTotalSpending(filteredTransactions)
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
