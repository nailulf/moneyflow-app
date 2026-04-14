import { createServerComponentClient } from '@/lib/supabase'

export interface ProcessingResult {
  success: boolean
  processedCount: number
  processedTransactions: Array<{
    originalId: string
    newTransactionId: string
    nextDate: string
  }>
  errors: Array<{
    transactionId: string
    error: string
  }>
}

export async function processRecurringTransactions(): Promise<ProcessingResult> {
  const supabase = createServerComponentClient()
  const now = new Date()
  // Reset time to noon to avoid timezone issues when comparing dates
  now.setHours(12, 0, 0, 0)
  
  // Get all recurring transactions that need processing
  const { data: recurringTransactions, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true)

  if (fetchError) {
    throw new Error(`Failed to fetch recurring transactions: ${fetchError.message}`)
  }

  const processedTransactions = []
  const errors = []

  for (const transaction of recurringTransactions) {
    try {
      // Check end date if exists
      if (transaction.recurring_end_date) {
        const endDate = new Date(transaction.recurring_end_date)
        endDate.setHours(23, 59, 59, 999) // End of that day
        if (now > endDate) {
          continue
        }
      }

      const frequency = transaction.recurring_frequency || 'monthly'
      const originalDate = new Date(transaction.date)
      originalDate.setHours(12, 0, 0, 0)
      
      const lastProcessed = transaction.last_processed_date 
        ? new Date(transaction.last_processed_date) 
        : new Date(transaction.date)
      lastProcessed.setHours(12, 0, 0, 0)

      // Skip if already processed today
      if (lastProcessed.getTime() === now.getTime()) {
        continue
      }

      let shouldRun = false

      if (frequency === 'daily') {
        // Run if today is different day than last processed
        // And we haven't processed it today (checked above)
        // And original start date has passed or is today
        if (now >= originalDate) {
          shouldRun = true
        }
      } else if (frequency === 'weekly') {
        // Run if today is the same day of week as original date
        // AND it has been at least 6 days since last run
        const daysSinceLastRun = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
        if (now.getDay() === originalDate.getDay() && daysSinceLastRun >= 6) {
          shouldRun = true
        }
      } else if (frequency === 'monthly') {
        // Run if today matches the original day of month, clamped to the
        // last day of the current month (e.g. 31st → 28th in Feb).
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const targetDay = Math.min(originalDate.getDate(), lastDayOfMonth)
        if (now.getDate() === targetDay) {
          const isSameMonthAsLast = lastProcessed.getMonth() === now.getMonth() && lastProcessed.getFullYear() === now.getFullYear()
          if (!isSameMonthAsLast) {
            shouldRun = true
          }
        }
      } else if (frequency === 'yearly') {
        // Run if today is same month as original, with day clamped to the
        // last day of that month (e.g. Feb 29 → Feb 28 in non-leap years).
        if (now.getMonth() === originalDate.getMonth()) {
          const lastDayOfTargetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          const targetDay = Math.min(originalDate.getDate(), lastDayOfTargetMonth)
          if (now.getDate() === targetDay) {
            const isSameYearAsLast = lastProcessed.getFullYear() === now.getFullYear()
            if (!isSameYearAsLast) {
              shouldRun = true
            }
          }
        }
      }

      if (!shouldRun) {
        continue
      }

      // Create new transaction based on the recurring one
      const newTransaction = {
        user_id: transaction.user_id,
        account_id: transaction.account_id,
        date: now.toISOString().split('T')[0], // Format as YYYY-MM-DD
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id,
        merchant: transaction.merchant,
        notes: transaction.notes,
        tags: transaction.tags,
        is_recurring: false, // New transaction is not recurring itself
        created_at: new Date().toISOString()
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

      // Update the original recurring transaction's last_processed_date.
      // If this fails, the next cron run would re-process and create a duplicate,
      // so we roll back the inserted transaction to keep things consistent.
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ last_processed_date: new Date().toISOString() })
        .eq('id', transaction.id)

      if (updateError) {
        console.error(`Error updating last_processed_date for transaction ${transaction.id}:`, updateError)
        // Rollback: delete the newly inserted transaction so it's not orphaned
        const { error: rollbackError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', newTransactionData.id)

        if (rollbackError) {
          // Rollback failed — log loudly so ops can clean up manually
          console.error(
            `[CRITICAL] Failed to roll back transaction ${newTransactionData.id} after last_processed_date update failed. Manual cleanup needed.`,
            rollbackError
          )
        }

        errors.push({
          transactionId: transaction.id,
          error: `Update failed, rolled back new transaction ${newTransactionData.id}: ${updateError.message}`
        })
        continue
      }

      processedTransactions.push({
        originalId: transaction.id,
        newTransactionId: newTransactionData.id,
        nextDate: now.toISOString().split('T')[0]
      })
    } catch (error) {
      console.error(`Error processing recurring transaction ${transaction.id}:`, error)
      errors.push({ transactionId: transaction.id, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return {
    success: true,
    processedCount: processedTransactions.length,
    processedTransactions,
    errors
  }
}
