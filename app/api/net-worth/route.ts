import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { format, subDays, subWeeks, subMonths, subYears } from 'date-fns'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'
import { batchGetExchangeRates, lookupRate, SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

const BASE_CURRENCY = 'IDR'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '1M' // 1W, 1M, 3M, 1Y, 5Y, ALL
    const endDate = searchParams.get('endDate') || new Date().toISOString()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    const endDateTime = new Date(endDate)

    // Calculate start date based on period
    let startDateTime: Date
    let dataPoints: number
    let intervalType: 'day' | 'week' | 'month' | 'year'

    switch (period) {
      case '1W':
        startDateTime = subDays(endDateTime, 7)
        dataPoints = 7
        intervalType = 'day'
        break
      case '1M':
        startDateTime = subMonths(endDateTime, 1)
        dataPoints = 30
        intervalType = 'day'
        break
      case '3M':
        startDateTime = subMonths(endDateTime, 3)
        dataPoints = 12
        intervalType = 'week'
        break
      case '1Y':
        startDateTime = subYears(endDateTime, 1)
        dataPoints = 12
        intervalType = 'month'
        break
      case '5Y':
        startDateTime = subYears(endDateTime, 5)
        dataPoints = 5
        intervalType = 'year'
        break
      case 'ALL':
        // Get the earliest transaction date for this user
        const { data: earliestTransaction } = await supabase
          .from('transactions')
          .select('date')
          .eq('user_id', userId)
          .order('date', { ascending: true })
          .limit(1)
        
        startDateTime = earliestTransaction && earliestTransaction.length > 0 
          ? new Date(earliestTransaction[0].date)
          : subYears(endDateTime, 5)
        dataPoints = Math.max(5, Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (365 * 24 * 60 * 60 * 1000)))
        intervalType = 'year'
        break
      default:
        startDateTime = subMonths(endDateTime, 1)
        dataPoints = 7
        intervalType = 'week'
    }

    // Get all accounts for the user (including created_at to correctly bound historical data)
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, type, balance, currency, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        netWorthData: [],
        currentNetWorth: 0,
        accounts: [],
        period 
      })
    }

    // Get all transactions for all accounts in one query
    const accountIds = accounts.map(account => account.id)
    const { data: allTransactions, error: transError } = await supabase
      .from('transactions')
      .select('amount, type, date, account_id')
      .in('account_id', accountIds)
      .lte('date', endDateTime.toISOString())
      .order('date', { ascending: true })

    if (transError) {
      console.error('❌ Error fetching transactions:', transError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Group transactions by account for efficient lookup
    const transactionsByAccount = new Map()
    if (allTransactions) {
      for (const transaction of allTransactions) {
        if (!transactionsByAccount.has(transaction.account_id)) {
          transactionsByAccount.set(transaction.account_id, [])
        }
        transactionsByAccount.get(transaction.account_id).push(transaction)
      }
    }

    const liabilityTypes = new Set(['CREDIT_CARD', 'MORTGAGE'])

    // ── Pre-compute all data point dates so we can batch-fetch exchange rates ──
    const allPointDates: Date[] = []
    for (let i = 0; i < dataPoints; i++) {
      let pointDate: Date
      switch (intervalType) {
        case 'day':   pointDate = new Date(startDateTime.getTime() + i * 24 * 60 * 60 * 1000); break
        case 'week':  pointDate = subWeeks(startDateTime, -i); break
        case 'month': pointDate = subMonths(startDateTime, -i); break
        case 'year':  pointDate = subYears(startDateTime, -i); break
        default:      pointDate = new Date(startDateTime.getTime() + i * 24 * 60 * 60 * 1000)
      }
      if (pointDate > endDateTime) break
      allPointDates.push(pointDate)
    }
    // Always include the final "today" point for exchange rate coverage
    allPointDates.push(endDateTime)

    // ── Batch-fetch exchange rates for all non-IDR currencies × all months ──
    const normalizeCurrency = (currency?: string) => {
      const normalized = (currency || BASE_CURRENCY).toUpperCase()
      return SUPPORTED_CURRENCIES.includes(normalized as (typeof SUPPORTED_CURRENCIES)[number])
        ? normalized
        : BASE_CURRENCY
    }

    const accountCurrencies = accounts.map((a) => normalizeCurrency(a.currency))
    const exchangeRates = await batchGetExchangeRates(
      accountCurrencies,
      BASE_CURRENCY,
      allPointDates
    )

    // ── Calculate historical net worth data points ──
    const netWorthData = []

    for (const pointDate of allPointDates.slice(0, -1)) { // exclude the extra endDateTime we added
      let totalNetWorth = 0

      for (const account of accounts) {
        if (account.created_at && new Date(account.created_at) > pointDate) continue

        const accountTransactions = transactionsByAccount.get(account.id) || []
        const accountBalance = calculateAccountBalanceAtDate(
          accountTransactions,
          pointDate,
          account.type,
          account.balance || 0
        )

        // Convert to base currency (IDR) using the rate for this month
        const currency = normalizeCurrency(account.currency)
        const rate = lookupRate(exchangeRates, currency, BASE_CURRENCY, pointDate)
        const balanceInBase = accountBalance * rate

        if (liabilityTypes.has(account.type)) {
          totalNetWorth -= Math.abs(balanceInBase)
        } else {
          totalNetWorth += balanceInBase
        }
      }

      netWorthData.push({
        date: format(
          pointDate,
          intervalType === 'day' || intervalType === 'week' ? 'dd MMM yyyy'
            : intervalType === 'month' ? 'MMM yyyy'
            : 'yyyy'
        ),
        value: Math.round(totalNetWorth * 100) / 100,
      })
    }

    // ── Get detailed account information with current balances ──
    const accountsWithBalances = accounts.map((account) => {
      const accountTransactions = transactionsByAccount.get(account.id) || []
      const currentBalance = calculateAccountBalanceAtDate(
        accountTransactions,
        endDateTime,
        account.type,
        account.balance || 0
      )

      const currency = normalizeCurrency(account.currency)
      const rate = lookupRate(exchangeRates, currency, BASE_CURRENCY, endDateTime)

      return {
        ...account,
        currentBalance,                          // Original currency — for display
        currentBalanceInBase: currentBalance * rate, // IDR equivalent — for net worth math
        baseCurrency: BASE_CURRENCY,
      }
    })

    // ── Current net worth uses base-currency-converted balances ──
    const currentNetWorth = accountsWithBalances.reduce((total, account) => {
      const balanceInBase = account.currentBalanceInBase ?? 0
      if (liabilityTypes.has(account.type)) {
        return total - Math.abs(balanceInBase)
      }
      return total + balanceInBase
    }, 0)

    // Always append today as the final data point so it's visible and not cut off at the edge.
    // The loop increments from startDateTime in fixed intervals and typically undershoots endDateTime
    // by one interval (e.g. a 12-month 1Y chart ends on Jan when today is mid-Feb).
    const todayLabel = format(
      endDateTime,
      intervalType === 'day' || intervalType === 'week' ? 'dd MMM yyyy'
        : intervalType === 'month' ? 'MMM yyyy'
        : 'yyyy'
    )
    const lastLabel = netWorthData.length > 0 ? netWorthData[netWorthData.length - 1].date : null
    if (lastLabel !== todayLabel) {
      netWorthData.push({ date: todayLabel, value: Math.round(currentNetWorth * 100) / 100 })
    }

    return NextResponse.json({
      netWorthData,
      currentNetWorth,
      accounts: accountsWithBalances,
      period,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString()
    })

  } catch (error: unknown) {
    console.error('❌ Net Worth API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
