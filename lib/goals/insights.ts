import { differenceInMonths, startOfMonth, getYear, getMonth } from 'date-fns'
import type { Transaction } from '@/types/database'
import { calculateRequiredSavings } from './calculations'

/**
 * Calculate average net monthly inflow into an account over a trailing window.
 * Net inflow = INCOME (+) + transfers-in (+) - EXPENSE (-) - transfers-out (-)
 * @param transactions - Array of transactions
 * @param accountId - Target account ID
 * @param asOf - Reference date
 * @param months - Trailing window in months (default 6)
 * @returns Average net inflow per month
 */
export function monthlyInflowRate(
  transactions: Transaction[],
  accountId: string,
  asOf: Date,
  months: number = 6
): number {
  // Calculate cutoff date: months back from asOf
  const cutoffDate = new Date(asOf)
  cutoffDate.setMonth(cutoffDate.getMonth() - months)

  // Filter transactions within the trailing window
  const relevantTxns = transactions.filter((tx) => {
    const txDate = new Date(tx.date)
    return txDate >= cutoffDate && txDate <= asOf
  })

  if (relevantTxns.length === 0) {
    return 0
  }

  // Group transactions by month and calculate net inflow per month
  const monthlyInflows = new Map<string, number>()

  relevantTxns.forEach((tx) => {
    const txDate = new Date(tx.date)
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`

    let effect = 0
    if (tx.type === 'INCOME') {
      effect = tx.amount
    } else if (tx.type === 'EXPENSE') {
      effect = -tx.amount
    } else if (tx.type === 'TRANSFER' && tx.to_account_id) {
      if (tx.account_id === accountId) {
        effect = -tx.amount
      } else if (tx.to_account_id === accountId) {
        effect = tx.amount
      }
    }

    monthlyInflows.set(monthKey, (monthlyInflows.get(monthKey) || 0) + effect)
  })

  // Calculate average over months with data
  const totalInflow = Array.from(monthlyInflows.values()).reduce((sum, inflow) => sum + inflow, 0)
  const monthsWithData = monthlyInflows.size

  return monthsWithData > 0 ? totalInflow / monthsWithData : 0
}

/**
 * Project the completion date when saving reaches target at the given rate.
 * @param saved - Current saved amount
 * @param target - Target amount
 * @param ratePerMonth - Monthly savings rate
 * @param asOf - Reference date
 * @returns ISO date string (YYYY-MM-DD) or null if rate <= 0 or already complete
 */
export function projectCompletionDate(
  saved: number,
  target: number,
  ratePerMonth: number,
  asOf: Date
): string | null {
  // Already completed
  if (saved >= target) {
    return null
  }

  // No positive rate
  if (ratePerMonth <= 0) {
    return null
  }

  const remaining = target - saved
  const monthsNeeded = remaining / ratePerMonth
  const completionDate = new Date(asOf)
  completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsNeeded))

  return completionDate.toISOString().split('T')[0]
}

/**
 * Count consecutive trailing months (ending the current month) with positive net inflow.
 * @param transactions - Array of transactions
 * @param accountId - Target account ID
 * @param asOf - Reference date
 * @returns Number of consecutive positive-inflow months
 */
export function consistencyStreak(
  transactions: Transaction[],
  accountId: string,
  asOf: Date
): number {
  // Group transactions by month and calculate net inflow per month
  const monthlyInflows = new Map<string, number>()

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date)
    const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`

    let effect = 0
    if (tx.type === 'INCOME') {
      effect = tx.amount
    } else if (tx.type === 'EXPENSE') {
      effect = -tx.amount
    } else if (tx.type === 'TRANSFER' && tx.to_account_id) {
      if (tx.account_id === accountId) {
        effect = -tx.amount
      } else if (tx.to_account_id === accountId) {
        effect = tx.amount
      }
    }

    monthlyInflows.set(monthKey, (monthlyInflows.get(monthKey) || 0) + effect)
  })

  if (monthlyInflows.size === 0) {
    return 0
  }

  // Get current month key
  const currentMonthKey = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`

  // Build sorted list of all months with data
  const allMonthKeys = Array.from(monthlyInflows.keys()).sort()

  // Find the index of the current month
  const currentMonthIndex = allMonthKeys.indexOf(currentMonthKey)

  if (currentMonthIndex === -1) {
    // asOf is not in any transaction month; find the latest month
    const latestMonthKey = allMonthKeys[allMonthKeys.length - 1]
    const latestMonthDate = parseMonthKey(latestMonthKey)
    const asOfMonthDate = startOfMonth(asOf)

    // If latest month is in the past, streak is 0
    if (latestMonthDate < asOfMonthDate) {
      return 0
    }
  }

  // Count backwards from current month (or latest available)
  let streak = 0
  let currentCheckIndex = currentMonthIndex >= 0 ? currentMonthIndex : allMonthKeys.length - 1

  while (currentCheckIndex >= 0) {
    const monthKey = allMonthKeys[currentCheckIndex]
    const inflow = monthlyInflows.get(monthKey) || 0

    if (inflow > 0) {
      streak++
      currentCheckIndex--
    } else {
      break
    }
  }

  return streak
}

/**
 * Thin wrapper over calculateRequiredSavings for computing required monthly savings.
 * @param remaining - Amount remaining to save
 * @param monthsToDeadline - Number of months until deadline
 * @returns Required monthly savings amount
 */
export function requiredMonthly(remaining: number, monthsToDeadline: number): number {
  if (remaining <= 0) {
    return 0
  }

  if (monthsToDeadline <= 0) {
    return remaining
  }

  return Math.ceil(remaining / monthsToDeadline)
}

/**
 * Helper: Parse month key (YYYY-MM) to Date at start of month
 */
function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
