import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

// This endpoint processes recurring transactions and generates new ones
// It should be called by a cron job on a daily basis
// Only processes transactions where the day_of_month matches today's date
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

    const supabase = createServerComponentClient()
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Get all recurring transactions that need processing for today
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 })
    }

    const processedTransactions = []
    const errors = []

    for (const transaction of recurringTransactions) {
      try {
        // Get the day of month from the original transaction
        const originalDate = new Date(transaction.date)
        const dayOfMonth = originalDate.getDate()
        
        // Only process if today's date matches the original day of month
        if (dayOfMonth !== currentDay) {
          continue
        }
        
        // Check if this transaction was already processed this month
        if (transaction.last_processed_date) {
          const lastProcessed = new Date(transaction.last_processed_date)
          if (lastProcessed.getMonth() === currentMonth && lastProcessed.getFullYear() === currentYear) {
            continue // Already processed this month
          }
        }
        
        // Calculate the next occurrence date (today)
        const nextDate = new Date(currentYear, currentMonth, currentDay)
        // Ensure we get the correct date by setting hours to avoid timezone issues
        nextDate.setHours(12, 0, 0, 0)

        // Create new transaction based on the recurring one
        const newTransaction = {
          user_id: transaction.user_id,
          date: nextDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category_id: transaction.category_id,
          merchant: transaction.merchant,
          notes: transaction.notes,
          tags: transaction.tags,
          is_recurring: false, // New transaction is not recurring itself
          created_at: now.toISOString()
        }

        // Insert the new transaction
        const { data: newTransactionData, error: insertError } = await supabase
          .from('transactions')
          .insert(newTransaction)
          .select()
          .single()

        if (insertError) {
          console.error(`Error creating transaction for recurring ID ${transaction.id}:`, insertError)
          errors.push({ transactionId: transaction.id, error: insertError.message })
          continue
        }

        // Update the original recurring transaction's last_processed_date
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ last_processed_date: now.toISOString() })
          .eq('id', transaction.id)

        if (updateError) {
          console.error(`Error updating last_processed_date for transaction ${transaction.id}:`, updateError)
          errors.push({ transactionId: transaction.id, error: updateError.message })
        } else {
          processedTransactions.push({
            originalId: transaction.id,
            newTransactionId: newTransactionData.id,
            nextDate: nextDate.toISOString().split('T')[0]
          })
        }
      } catch (error) {
        console.error(`Error processing recurring transaction ${transaction.id}:`, error)
        errors.push({ transactionId: transaction.id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedTransactions.length,
      processedTransactions,
      errors,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      const currentDay = now.getDate()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      const { data: recurringTransactions, error } = await supabase
        .from('transactions')
        .select('id, description, date, amount, type, last_processed_date')
        .eq('is_recurring', true)
      
      // Filter transactions that would be processed today
      const todaysTransactions = recurringTransactions?.filter(transaction => {
        const originalDate = new Date(transaction.date)
        const dayOfMonth = originalDate.getDate()
        
        // Check if day matches today
        if (dayOfMonth !== currentDay) {
          return false
        }
        
        // Check if already processed this month
        if (transaction.last_processed_date) {
          const lastProcessed = new Date(transaction.last_processed_date)
          if (lastProcessed.getMonth() === currentMonth && lastProcessed.getFullYear() === currentYear) {
            return false
          }
        }
        
        return true
      }) || []

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch recurring transactions' }, { status: 500 })
      }

      return NextResponse.json({
        recurringTransactions: todaysTransactions,
        currentDay,
        currentMonth: currentMonth + 1, // Display as 1-12
        currentYear,
        timestamp: now.toISOString()
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