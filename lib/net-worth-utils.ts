import { AccountDB, Transaction } from '@/types/database'

export interface NetWorthDataPoint {
  date: string
  value: number
}

export interface AccountWithBalance extends AccountDB {
  currentBalance: number
  percentageOfTotal?: number
}

export interface NetWorthResponse {
  netWorthData: NetWorthDataPoint[]
  currentNetWorth: number
  accounts: AccountWithBalance[]
  period: string
  startDate: string
  endDate: string
}

export interface AccountCategory {
  name: string
  accounts: AccountWithBalance[]
  total: number
  percentage: number
  color: string
}

/**
 * Calculate the net worth from account balances
 * Credit cards and liabilities reduce net worth, assets increase it
 */
export function calculateNetWorth(accounts: AccountWithBalance[]): number {
  return accounts.reduce((total, account) => {
    switch (account.type) {
      case 'CREDIT_CARD':
        // Credit card balance is debt, so it reduces net worth
        return total - account.currentBalance
      case 'BANK':
      case 'CASH':
      case 'INVESTMENT':
      case 'OTHER':
        // These are assets, so they increase net worth
        return total + account.currentBalance
      default:
        return total + account.currentBalance
    }
  }, 0)
}

/**
 * Calculate account balance at a specific point in time based on transactions
 */
export function calculateAccountBalanceAtDate(
  transactions: Transaction[],
  targetDate: Date,
  accountType: AccountDB['type'] = 'BANK',
  initialBalance: number = 0
): number {
  const filteredTransactions = transactions.filter(
    transaction => new Date(transaction.date) <= targetDate
  )

  let balance = initialBalance
  for (const transaction of filteredTransactions) {
    switch (transaction.type) {
      case 'INCOME':
        balance += transaction.amount
        break
      case 'EXPENSE':
        balance -= transaction.amount
        break
      case 'TRANSFER':
        // Transfer handling would need more complex logic to avoid double counting
        // For now, we'll skip transfers in balance calculation
        break
    }
  }

  return balance
}

/**
 * Categorize accounts by type for display purposes
 */
export function categorizeAccounts(accounts: AccountWithBalance[]): AccountCategory[] {
  const totalNetWorth = calculateNetWorth(accounts)
  
  // Group accounts by type
  const accountGroups: { [key: string]: AccountWithBalance[] } = {
    CASH: [],
    BANK: [],
    INVESTMENT: [],
    CREDIT_CARD: [],
    OTHER: []
  }

  accounts.forEach(account => {
    if (accountGroups[account.type]) {
      accountGroups[account.type].push(account)
    } else {
      accountGroups.OTHER.push(account)
    }
  })

  // Create categories with totals and percentages
  const categories: AccountCategory[] = []

  // Cash accounts
  if (accountGroups.CASH.length > 0) {
    const total = accountGroups.CASH.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.balance ?? 0), 0)
    categories.push({
      name: 'Cash',
      accounts: accountGroups.CASH,
      total,
      percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0,
      color: '#10b981' // emerald-500
    })
  }

  // Bank accounts
  if (accountGroups.BANK.length > 0) {
    const total = accountGroups.BANK.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.balance ?? 0), 0)
    categories.push({
      name: 'Bank Accounts',
      accounts: accountGroups.BANK,
      total,
      percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0,
      color: '#3b82f6' // blue-500
    })
  }

  // Investment accounts
  if (accountGroups.INVESTMENT.length > 0) {
    const total = accountGroups.INVESTMENT.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.balance ?? 0), 0)
    categories.push({
      name: 'Investments',
      accounts: accountGroups.INVESTMENT,
      total,
      percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0,
      color: '#8b5cf6' // violet-500
    })
  }

  // Credit cards (liabilities)
  if (accountGroups.CREDIT_CARD.length > 0) {
    const total = accountGroups.CREDIT_CARD.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.balance ?? 0), 0)
    categories.push({
      name: 'Credit Cards',
      accounts: accountGroups.CREDIT_CARD,
      total: -total, // Show as negative since it's debt
      percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0,
      color: '#ef4444' // red-500
    })
  }

  // Other accounts
  if (accountGroups.OTHER.length > 0) {
    const total = accountGroups.OTHER.reduce((sum, acc) => sum + (acc.currentBalance ?? acc.balance ?? 0), 0)
    categories.push({
      name: 'Other',
      accounts: accountGroups.OTHER,
      total,
      percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0,
      color: '#6b7280' // gray-500
    })
  }

  return categories.filter(category => category.accounts.length > 0)
}



/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100
}

/**
 * Get the change in net worth over a period
 */
export function getNetWorthChange(netWorthData: NetWorthDataPoint[]): {
  amount: number
  percentage: number
} {
  if (netWorthData.length < 2) {
    return { amount: 0, percentage: 0 }
  }

  const firstValue = netWorthData[0].value
  const lastValue = netWorthData[netWorthData.length - 1].value
  const amount = lastValue - firstValue
  const percentage = calculatePercentageChange(firstValue, lastValue)

  return { amount, percentage }
}

/**
 * Fetch net worth data from the API
 */
export async function fetchNetWorthData(
  userId: string,
  period: string,
  endDate?: string
): Promise<NetWorthResponse> {
  const params = new URLSearchParams({
    userId,
    period,
    ...(endDate && { endDate })
  })

  const response = await fetch(`/api/net-worth?${params}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch net worth data: ${response.statusText}`)
  }

  return response.json()
}


/**
 * Validate and sanitize period parameter
 */
export function validatePeriod(period: string): string {
  const validPeriods = ['1W', '1M', '3M', '1Y', '5Y', 'ALL']
  return validPeriods.includes(period) ? period : '1Y'
}