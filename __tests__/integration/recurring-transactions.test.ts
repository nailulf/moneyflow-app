import { loadEnvConfig } from '@next/env'

// Load environment variables before importing anything else
const projectDir = process.cwd()
loadEnvConfig(projectDir)

import { processRecurringTransactions } from '../../lib/recurring-processor'
import { createServerComponentClient } from '../../lib/supabase'

// Mock environment variables if not set (for safety, though actual integration needs them)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Skipping recurring transaction integration tests due to missing env vars')
}

describe('Recurring Transaction Integration', () => {
  // Only create client if env vars exist
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? createServerComponentClient() 
    : null as any

  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID || '1d16c616-77a6-48de-9a54-dde7845f720d' // Fallback to the ID seen in AddTransactionForm
  const createdTransactionIds: string[] = []

  beforeAll(async () => {
    // Ensure we have a valid test environment
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('MISSING ENV VARS in beforeAll')
      return
    }
  })

  afterAll(async () => {
    // Cleanup created transactions
    if (supabase && createdTransactionIds.length > 0) {
      await supabase.from('transactions').delete().in('id', createdTransactionIds)
    }
  })

  it('should process a due weekly recurring transaction', async () => {
    if (!supabase) {
      console.warn('Skipping test due to missing Supabase client')
      return
    }

    // 1. Create a recurring transaction due today (created 1 week ago)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    // Get a category first
    const { data: categories } = await supabase.from('categories').select('id').limit(1)
    if (!categories || categories.length === 0) {
        console.warn('No categories found, skipping test')
        return
    }

    const { data: recurringTx, error } = await supabase.from('transactions').insert({
      user_id: TEST_USER_ID,
      date: oneWeekAgo.toISOString().split('T')[0],
      description: 'Test Weekly Recurring',
      amount: 100,
      type: 'EXPENSE',
      category_id: categories[0].id,
      is_recurring: true,
      recurring_frequency: 'weekly',
      last_processed_date: oneWeekAgo.toISOString().split('T')[0] // Processed on creation day
    }).select().single()

    if (error) {
        console.error('Error creating test transaction:', error)
        throw error
    }
    
    if (recurringTx) {
        createdTransactionIds.push(recurringTx.id)
    }

    // 2. Run the processor
    const result = await processRecurringTransactions()

    // 3. Verify
    expect(result.success).toBe(true)
    // We expect at least our transaction to be processed (could be others)
    const processedTx = result.processedTransactions.find(t => t.originalId === recurringTx.id)
    
    if (!processedTx) {
        console.error('Processed transactions:', result.processedTransactions)
        console.error('Errors:', result.errors)
    }

    expect(processedTx).toBeDefined()
    if (processedTx) {
        createdTransactionIds.push(processedTx.newTransactionId)
        
        // Check if new transaction exists
        const { data: newTx } = await supabase.from('transactions').select('*').eq('id', processedTx.newTransactionId).single()
        expect(newTx).toBeDefined()
        expect(newTx.description).toBe('Test Weekly Recurring')
        expect(newTx.is_recurring).toBe(false)
    }
  })

  it('should process a due daily recurring transaction', async () => {
    if (!supabase) return

    // 1. Create a daily recurring transaction due today (created yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Get a category first
    const { data: categories } = await supabase.from('categories').select('id').limit(1)
    if (!categories || categories.length === 0) return

    const { data: recurringTx, error } = await supabase.from('transactions').insert({
      user_id: TEST_USER_ID,
      date: yesterday.toISOString().split('T')[0],
      description: 'Test Daily Recurring',
      amount: 50,
      type: 'EXPENSE',
      category_id: categories[0].id,
      is_recurring: true,
      recurring_frequency: 'daily',
      last_processed_date: yesterday.toISOString().split('T')[0]
    }).select().single()

    if (error) throw error
    createdTransactionIds.push(recurringTx.id)

    // 2. Run the processor
    const result = await processRecurringTransactions()

    // 3. Verify
    const processedTx = result.processedTransactions.find(t => t.originalId === recurringTx.id)
    expect(processedTx).toBeDefined()
    if (processedTx) {
        createdTransactionIds.push(processedTx.newTransactionId)
        
        // Check if new transaction exists
        const { data: newTx } = await supabase.from('transactions').select('*').eq('id', processedTx.newTransactionId).single()
        expect(newTx).toBeDefined()
        expect(newTx.description).toBe('Test Daily Recurring')
        expect(newTx.is_recurring).toBe(false)
        expect(newTx.date).toBe(new Date().toISOString().split('T')[0])
    }
  })

  it('should NOT process a transaction that is not due', async () => {
    if (!supabase) return

    // 1. Create a recurring transaction NOT due (created yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Get a category first
    const { data: categories } = await supabase.from('categories').select('id').limit(1)
    if (!categories || categories.length === 0) return

    const { data: recurringTx, error } = await supabase.from('transactions').insert({
      user_id: TEST_USER_ID,
      date: yesterday.toISOString().split('T')[0],
      description: 'Test Weekly Recurring Not Due',
      amount: 100,
      type: 'EXPENSE',
      category_id: categories[0].id,
      is_recurring: true,
      recurring_frequency: 'weekly',
      last_processed_date: yesterday.toISOString().split('T')[0]
    }).select().single()

    if (error) throw error
    createdTransactionIds.push(recurringTx.id)

    // 2. Run the processor
    const result = await processRecurringTransactions()

    // 3. Verify
    const processedTx = result.processedTransactions.find(t => t.originalId === recurringTx.id)
    expect(processedTx).toBeUndefined()
  })

    it('should NOT process a transaction past its end date', async () => {
    if (!supabase) return

    // 1. Create a recurring transaction that ended yesterday
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    // Get a category first
    const { data: categories } = await supabase.from('categories').select('id').limit(1)
    if (!categories || categories.length === 0) return

    const { data: recurringTx, error } = await supabase.from('transactions').insert({
      user_id: TEST_USER_ID,
      date: oneWeekAgo.toISOString().split('T')[0],
      description: 'Test Ended Recurring',
      amount: 100,
      type: 'EXPENSE',
      category_id: categories[0].id,
      is_recurring: true,
      recurring_frequency: 'weekly',
      recurring_end_date: yesterday.toISOString(), // Ended yesterday
      last_processed_date: oneWeekAgo.toISOString().split('T')[0]
    }).select().single()

    if (error) throw error
    createdTransactionIds.push(recurringTx.id)

    // 2. Run the processor
    const result = await processRecurringTransactions()

    // 3. Verify
    const processedTx = result.processedTransactions.find(t => t.originalId === recurringTx.id)
    expect(processedTx).toBeUndefined()
  })
})
