import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

// Interface for monthly aggregated data
interface MonthlyData {
  year: number
  month: number
  monthName: string
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  transactionCount: number
  incomeTransactionCount: number
  expenseTransactionCount: number
}

// Interface for API response
interface MonthlyTransactionResponse {
  monthlyData: MonthlyData[]
  summary: {
    totalMonths: number
    averageIncome: number
    averageExpenses: number
    averageNetCashFlow: number
    totalIncome: number
    totalExpenses: number
    totalNetCashFlow: number
  }
  dateRange: {
    startDate: string
    endDate: string
  }
}

/**
 * GET /api/transactions/monthly
 * 
 * Retrieves and processes monthly transaction data with aggregated values.
 * 
 * Query Parameters:
 * - userId (required): User ID to filter transactions
 * - startDate (optional): Start date for filtering (YYYY-MM-DD)
 * - endDate (optional): End date for filtering (YYYY-MM-DD)
 * - months (optional): Number of months to retrieve (default: 12, max: 24)
 * 
 * Returns:
 * - Monthly breakdowns with income, expenses, and net cash flow
 * - Summary statistics
 * - Proper error handling and status codes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paramUserId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const monthsParam = searchParams.get('months')
    
    // Environment check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' }, 
        { status: 503 }
      )
    }

    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (paramUserId && paramUserId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 })
    }

    const userId = user.id

    // Parse and validate months parameter
    const months = monthsParam ? Math.min(Math.max(parseInt(monthsParam), 1), 24) : 12

    // Calculate date range if not provided
    let queryStartDate = startDate
    let queryEndDate = endDate

    if (!queryStartDate || !queryEndDate) {
      const now = new Date()
      if (!queryEndDate) {
        queryEndDate = now.toISOString().split('T')[0]
      }
      if (!queryStartDate) {
        const startDateObj = new Date(now)
        startDateObj.setMonth(startDateObj.getMonth() - months + 1)
        startDateObj.setDate(1) // Start from first day of the month
        queryStartDate = startDateObj.toISOString().split('T')[0]
      }
    }

    // Optimized query to fetch transactions with minimal data transfer
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('date, amount, type')
      .eq('user_id', userId)
      .gte('date', queryStartDate)
      .lte('date', queryEndDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Database error fetching transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transaction data', code: 'DATABASE_ERROR' }, 
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        monthlyData: [],
        summary: {
          totalMonths: 0,
          averageIncome: 0,
          averageExpenses: 0,
          averageNetCashFlow: 0,
          totalIncome: 0,
          totalExpenses: 0,
          totalNetCashFlow: 0
        },
        dateRange: {
          startDate: queryStartDate,
          endDate: queryEndDate
        }
      })
    }

    // Process transactions into monthly aggregates
    const monthlyMap = new Map<string, MonthlyData>()

    // Initialize all months in the range
    const start = new Date(queryStartDate)
    const end = new Date(queryEndDate)
    const current = new Date(start.getFullYear(), start.getMonth(), 1)

    while (current <= end) {
      const year = current.getFullYear()
      const month = current.getMonth() + 1
      const key = `${year}-${month.toString().padStart(2, '0')}`
      
      monthlyMap.set(key, {
        year,
        month,
        monthName: current.toLocaleString('default', { month: 'long' }),
        totalIncome: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        transactionCount: 0,
        incomeTransactionCount: 0,
        expenseTransactionCount: 0
      })

      current.setMonth(current.getMonth() + 1)
    }

    // Aggregate transactions by month
    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.date)
      const year = transactionDate.getFullYear()
      const month = transactionDate.getMonth() + 1
      const key = `${year}-${month.toString().padStart(2, '0')}`
      
      const monthData = monthlyMap.get(key)
      if (!monthData) continue

      const amount = Math.abs(transaction.amount)
      
      monthData.transactionCount++

      if (transaction.type === 'INCOME') {
        monthData.totalIncome += amount
        monthData.incomeTransactionCount++
      } else if (transaction.type === 'EXPENSE') {
        monthData.totalExpenses += amount
        monthData.expenseTransactionCount++
      }
      // Note: TRANSFER transactions are not included in income/expense calculations
    }

    // Calculate net cash flow for each month
    for (const monthData of monthlyMap.values()) {
      monthData.netCashFlow = monthData.totalIncome - monthData.totalExpenses
    }

    // Convert to array and sort by date
    const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    // Calculate summary statistics
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.totalIncome, 0)
    const totalExpenses = monthlyData.reduce((sum, month) => sum + month.totalExpenses, 0)
    const totalNetCashFlow = totalIncome - totalExpenses
    const totalMonths = monthlyData.length

    const summary = {
      totalMonths,
      averageIncome: totalMonths > 0 ? totalIncome / totalMonths : 0,
      averageExpenses: totalMonths > 0 ? totalExpenses / totalMonths : 0,
      averageNetCashFlow: totalMonths > 0 ? totalNetCashFlow / totalMonths : 0,
      totalIncome,
      totalExpenses,
      totalNetCashFlow
    }

    const response: MonthlyTransactionResponse = {
      monthlyData,
      summary,
      dateRange: {
        startDate: queryStartDate,
        endDate: queryEndDate
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
      }
    })

  } catch (error) {
    console.error('API Error in monthly transactions:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing your request'
      }, 
      { status: 500 }
    )
  }
}