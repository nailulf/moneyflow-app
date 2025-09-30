import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from 'date-fns'

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
        dataPoints = 30
        intervalType = 'day'
    }

    // Get all accounts for the user
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, type, balance, currency')
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

    // Calculate historical net worth data points
    const netWorthData = []

    for (let i = 0; i < dataPoints; i++) {
      let pointDate: Date

      switch (intervalType) {
        case 'day':
          pointDate = new Date(startDateTime.getTime() + (i * 24 * 60 * 60 * 1000))
          break
        case 'week':
          pointDate = new Date(startDateTime.getTime() + (i * 7 * 24 * 60 * 60 * 1000))
          break
        case 'month':
          pointDate = subMonths(startDateTime, -i)
          break
        case 'year':
          pointDate = subYears(startDateTime, -i)
          break
        default:
          pointDate = new Date(startDateTime.getTime() + (i * 24 * 60 * 60 * 1000))
      }

      if (pointDate > endDateTime) break

      // Calculate net worth at this point in time
      let totalNetWorth = 0

      for (const account of accounts) {
        const accountTransactions = transactionsByAccount.get(account.id) || []
        
        // Calculate account balance at this point in time
        let accountBalance = 0
        for (const transaction of accountTransactions) {
          const transactionDate = new Date(transaction.date)
          if (transactionDate <= pointDate) {
            switch (transaction.type) {
              case 'INCOME':
                accountBalance += transaction.amount
                break
              case 'EXPENSE':
                accountBalance -= transaction.amount
                break
              // TRANSFER transactions are handled separately to avoid double counting
            }
          }
        }

        // For credit cards, negative balance is actually positive net worth (less debt)
        if (account.type === 'CREDIT_CARD') {
          totalNetWorth -= accountBalance // Credit card debt reduces net worth
        } else {
          totalNetWorth += accountBalance
        }
      }

      netWorthData.push({
        date: format(pointDate, intervalType === 'day' ? 'MMM dd' : intervalType === 'month' ? 'MMM yyyy' : 'yyyy'),
        value: Math.round(totalNetWorth * 100) / 100 // Round to 2 decimal places
      })
    }

    // Calculate current net worth (most recent data point)
    const currentNetWorth = netWorthData.length > 0 ? netWorthData[netWorthData.length - 1].value : 0

    // Get detailed account information with current balances using already fetched transactions
    const accountsWithBalances = accounts.map((account) => {
      const accountTransactions = transactionsByAccount.get(account.id) || []
      
      let currentBalance = 0
      for (const transaction of accountTransactions) {
        const transactionDate = new Date(transaction.date)
        if (transactionDate <= endDateTime) {
          switch (transaction.type) {
            case 'INCOME':
              currentBalance += transaction.amount
              break
            case 'EXPENSE':
              currentBalance -= transaction.amount
              break
          }
        }
      }

      return {
        ...account,
        currentBalance: Math.round(currentBalance * 100) / 100
      }
    })

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