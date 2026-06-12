import { AccountDB } from '@/types/database'

/** Minimal transaction shape needed for balance calculations. */
export type BalanceTransaction = {
  amount: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  date: string
  account_id: string | null
  to_account_id?: string | null
  currency?: string | null
}

export interface NetWorthDataPoint {
  date: string
  value: number
}

export interface AccountWithBalance extends AccountDB {
  currentBalance: number
  /** Balance converted to the base display currency (default: IDR). Set by the API. */
  currentBalanceInBase?: number
  /** The base currency used for net worth aggregation (e.g. 'IDR'). */
  baseCurrency?: string
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

const LIABILITY_ACCOUNT_TYPES = new Set(['CREDIT_CARD', 'MORTGAGE'])

function getAccountBalance(account: AccountWithBalance): number {
  // Prefer the base-currency-converted balance for net worth math.
  // Fall back to currentBalance (raw) if no conversion is available.
  return account.currentBalanceInBase ?? account.currentBalance ?? account.balance ?? 0
}

function isLiabilityAccount(account: AccountWithBalance): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(account.type) || getAccountBalance(account) < 0
}

/**
 * Calculate the net worth from account balances
 * Credit cards and liabilities reduce net worth, assets increase it
 */
export function calculateNetWorth(accounts: AccountWithBalance[]): number {
  return accounts.reduce((total, account) => {
    const balance = getAccountBalance(account)
    if (isLiabilityAccount(account)) {
      return total - Math.abs(balance)
    }
    return total + balance
  }, 0)
}

/**
 * Calculate account balance at a specific point in time based on transactions.
 *
 * For TRANSFER transactions:
 *   - If the transaction's `account_id` matches `accountId` → money OUT (subtract)
 *   - If the transaction's `to_account_id` matches `accountId` → money IN (add)
 *   - Legacy transfers without `to_account_id` are skipped (no way to determine direction)
 *
 * Cross-currency: if `accountCurrency` is provided and a transaction has a different
 * currency, the amount is converted using `currencyRates` (a map of "FROM-TO" → rate).
 * If no rate is found, the raw amount is used (no conversion).
 */
export function calculateAccountBalanceAtDate(
  transactions: BalanceTransaction[],
  targetDate: Date,
  accountType: AccountDB['type'] = 'BANK',
  initialBalance: number = 0,
  accountId?: string,
  accountCurrency?: string,
  currencyRates?: Map<string, number>
): number {
  const filteredTransactions = transactions.filter(
    transaction => new Date(transaction.date) <= targetDate
  )

  const convert = (amount: number, txCurrency?: string | null): number => {
    if (!accountCurrency || !currencyRates || !txCurrency || txCurrency === accountCurrency) {
      return amount
    }
    const rate = currencyRates.get(`${txCurrency}-${accountCurrency}`)
    return rate ? amount * rate : amount
  }

  let balance = initialBalance
  for (const transaction of filteredTransactions) {
    const amount = convert(transaction.amount, transaction.currency)
    switch (transaction.type) {
      case 'INCOME':
        balance += amount
        break
      case 'EXPENSE':
        balance -= amount
        break
      case 'TRANSFER':
        if (accountId && transaction.to_account_id) {
          if (transaction.account_id === accountId) {
            balance -= amount
          } else if (transaction.to_account_id === accountId) {
            balance += amount
          }
        }
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
    DIGITAL_WALLET: [],
    INVESTMENT: [],
    PROPERTY: [],
    VEHICLE: [],
    MORTGAGE: [],
    CREDIT_CARD: [],
    OTHER: []
  }

  accounts.forEach(account => {
    if (accountGroups[account.type] !== undefined) {
      accountGroups[account.type].push(account)
    } else {
      accountGroups.OTHER.push(account)
    }
  })

  // Create categories with totals and percentages
  const categories: AccountCategory[] = []

  // Cash accounts
  if (accountGroups.CASH.length > 0) {
    const totalRaw = accountGroups.CASH.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Cash',
      accounts: accountGroups.CASH,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--success))'
    })
  }

  // Bank accounts
  if (accountGroups.BANK.length > 0) {
    const totalRaw = accountGroups.BANK.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Bank Accounts',
      accounts: accountGroups.BANK,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
    })
  }

  // Digital wallets
  if (accountGroups.DIGITAL_WALLET.length > 0) {
    const totalRaw = accountGroups.DIGITAL_WALLET.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Digital Wallets',
      accounts: accountGroups.DIGITAL_WALLET,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--success))'
    })
  }

  // Investment accounts
  if (accountGroups.INVESTMENT.length > 0) {
    const totalRaw = accountGroups.INVESTMENT.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Investments',
      accounts: accountGroups.INVESTMENT,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'
    })
  }

  // Property accounts (assets)
  if (accountGroups.PROPERTY.length > 0) {
    const totalRaw = accountGroups.PROPERTY.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Property',
      accounts: accountGroups.PROPERTY,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--chart-3))'
    })
  }

  // Vehicle accounts (assets)
  if (accountGroups.VEHICLE.length > 0) {
    const totalRaw = accountGroups.VEHICLE.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Vehicles',
      accounts: accountGroups.VEHICLE,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--chart-4))'
    })
  }

  // Credit cards (liabilities)
  if (accountGroups.CREDIT_CARD.length > 0) {
    const totalRaw = accountGroups.CREDIT_CARD.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const total = -Math.abs(totalRaw)
    categories.push({
      name: 'Credit Cards',
      accounts: accountGroups.CREDIT_CARD,
      total,
      percentage: totalNetWorth > 0 ? (Math.abs(total) / totalNetWorth) * 100 : 0,
      color: 'hsl(var(--destructive))'
    })
  }

  // Mortgage / KPR (liabilities)
  if (accountGroups.MORTGAGE.length > 0) {
    const totalRaw = accountGroups.MORTGAGE.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const total = -Math.abs(totalRaw)
    categories.push({
      name: 'Mortgage / KPR',
      accounts: accountGroups.MORTGAGE,
      total,
      percentage: totalNetWorth > 0 ? (Math.abs(total) / totalNetWorth) * 100 : 0,
      color: 'hsl(var(--destructive))'
    })
  }

  // Other accounts
  if (accountGroups.OTHER.length > 0) {
    const totalRaw = accountGroups.OTHER.reduce((sum, acc) => sum + getAccountBalance(acc), 0)
    const isLiability = totalRaw < 0
    const total = isLiability ? -Math.abs(totalRaw) : totalRaw
    categories.push({
      name: 'Other',
      accounts: accountGroups.OTHER,
      total,
      percentage: totalNetWorth > 0
        ? (isLiability ? (Math.abs(total) / totalNetWorth) * 100 : (total / totalNetWorth) * 100)
        : 0,
      color: isLiability ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'
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
