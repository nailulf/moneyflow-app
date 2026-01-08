import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { processRecurringTransactions } from '@/lib/recurring-processor'

// This endpoint processes recurring transactions and generates new ones
// It should be called by a cron job on a daily basis
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source (cron job)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const result = await processRecurringTransactions()

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint for manual testing and status checking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const test = searchParams.get('test')
    
    if (test === 'true') {
      // Return information about recurring transactions that would be processed
      const supabase = createServerComponentClient()
      const now = new Date()
      now.setHours(12, 0, 0, 0)
      
      const { data: recurringTransactions, error } = await supabase
        .from('transactions')
        .select('id, description, date, amount, type, last_processed_date, recurring_frequency, recurring_end_date')
        .eq('is_recurring', true)
      
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 })
      }

      // Filter transactions that would be processed today
      const todaysTransactions = recurringTransactions?.filter(transaction => {
        // Check end date
        if (transaction.recurring_end_date) {
          const endDate = new Date(transaction.recurring_end_date)
          endDate.setHours(23, 59, 59, 999)
          if (now > endDate) return false
        }

        const frequency = transaction.recurring_frequency || 'monthly'
        const originalDate = new Date(transaction.date)
        originalDate.setHours(12, 0, 0, 0)
        
        const lastProcessed = transaction.last_processed_date 
          ? new Date(transaction.last_processed_date) 
          : new Date(transaction.date)
        lastProcessed.setHours(12, 0, 0, 0)

        // Skip if already processed today
        if (lastProcessed.getTime() === now.getTime()) return false

        if (frequency === 'weekly') {
          const daysSinceLastRun = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
          return now.getDay() === originalDate.getDay() && daysSinceLastRun >= 6
        } else if (frequency === 'monthly') {
          if (now.getDate() !== originalDate.getDate()) return false
          const isSameMonthAsLast = lastProcessed.getMonth() === now.getMonth() && lastProcessed.getFullYear() === now.getFullYear()
          return !isSameMonthAsLast
        } else if (frequency === 'yearly') {
          if (now.getDate() !== originalDate.getDate() || now.getMonth() !== originalDate.getMonth()) return false
          const isSameYearAsLast = lastProcessed.getFullYear() === now.getFullYear()
          return !isSameYearAsLast
        }
        
        return false
      }) || []

      return NextResponse.json({
        recurringTransactions: todaysTransactions,
        currentDay: now.getDate(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ 
      message: 'Recurring transactions processor',
      usage: 'POST to process recurring transactions, GET with ?test=true to see pending transactions'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
