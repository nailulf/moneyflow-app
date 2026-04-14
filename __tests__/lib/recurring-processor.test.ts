/**
 * Unit tests for recurring-processor month-end clamping logic.
 *
 * These tests mock Date and the Supabase client so we can deterministically
 * verify that monthly/yearly recurring transactions fire on short months
 * (e.g. a 31st-of-month recurring fires on Feb 28).
 */

// Mutable mock state — tests update these before calling the processor
let mockTransactions: any[] = []
let mockInsertError: any = null
let mockUpdateError: any = null
let mockDeleteError: any = null
const mockInsertedRows: any[] = []
const mockDeletedIds: string[] = []

jest.mock('../../lib/supabase', () => ({
  createServerComponentClient: () => ({
    from: (table: string) => {
      if (table !== 'transactions') {
        return {} as any
      }
      return {
        // SELECT — returns mockTransactions for the initial fetch
        select: () => ({
          eq: () => ({
            data: mockTransactions,
            error: null,
          }),
        }),
        // INSERT — can be configured to fail via mockInsertError
        insert: (row: any) => ({
          select: () => ({
            single: async () => {
              if (mockInsertError) return { data: null, error: mockInsertError }
              const inserted = { id: `new-tx-${mockInsertedRows.length + 1}`, ...row }
              mockInsertedRows.push(inserted)
              return { data: inserted, error: null }
            },
          }),
        }),
        // UPDATE — can be configured to fail via mockUpdateError
        update: () => ({
          eq: async () => ({ error: mockUpdateError }),
        }),
        // DELETE — can be configured to fail via mockDeleteError; records deleted ids
        delete: () => ({
          eq: async (_col: string, id: string) => {
            mockDeletedIds.push(id)
            return { error: mockDeleteError }
          },
        }),
      }
    },
  }),
}))

import { processRecurringTransactions } from '../../lib/recurring-processor'

function makeRecurringTransaction(overrides: Record<string, any>) {
  return {
    id: 'recurring-tx-1',
    user_id: 'test-user',
    account_id: 'test-account',
    date: '2026-01-31',
    description: 'Test Recurring',
    amount: 100,
    type: 'EXPENSE',
    category_id: 'cat-1',
    merchant: null,
    notes: null,
    tags: null,
    is_recurring: true,
    recurring_frequency: 'monthly',
    recurring_end_date: null,
    last_processed_date: '2026-01-31',
    ...overrides,
  }
}

describe('Recurring Processor — month-end clamping', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockTransactions = []
    mockInsertError = null
    mockUpdateError = null
    mockDeleteError = null
    mockInsertedRows.length = 0
    mockDeletedIds.length = 0
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ─── Monthly frequency ───────────────────────────────────────────────

  it('monthly: fires on Feb 28 for a transaction originally set on the 31st', async () => {
    // Feb 28, 2026 (non-leap year — Feb has 28 days)
    jest.setSystemTime(new Date(2026, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-01-31',
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeDefined()
  })

  it('monthly: fires on Apr 30 for a transaction originally set on the 31st', async () => {
    // Apr 30, 2026 (April has 30 days)
    jest.setSystemTime(new Date(2026, 3, 30, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-03-31', // Last processed in March
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeDefined()
  })

  it('monthly: fires on Feb 29 in a leap year for a 30th-of-month transaction', async () => {
    // Feb 29, 2028 (leap year)
    jest.setSystemTime(new Date(2028, 1, 29, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2028-01-30',
        last_processed_date: '2028-01-30',
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeDefined()
  })

  it('monthly: does NOT fire on Feb 27 for a 31st transaction (not last day yet)', async () => {
    // Feb 27, 2026 — not the last day of Feb
    jest.setSystemTime(new Date(2026, 1, 27, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-01-31',
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeUndefined()
  })

  it('monthly: does NOT double-process in same month after clamped firing', async () => {
    // Feb 28, 2026 — already processed this month
    jest.setSystemTime(new Date(2026, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-02-28', // Already processed this Feb
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeUndefined()
  })

  it('monthly: still fires on exact day in 31-day months', async () => {
    // Mar 31, 2026
    jest.setSystemTime(new Date(2026, 2, 31, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-02-28',
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'recurring-tx-1')
    expect(processed).toBeDefined()
  })

  // ─── Yearly frequency ────────────────────────────────────────────────

  it('yearly: fires on Feb 28 in non-leap year for a Feb 29 transaction', async () => {
    // Feb 28, 2027 (non-leap year)
    jest.setSystemTime(new Date(2027, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        id: 'yearly-tx-1',
        date: '2024-02-29', // Created in a leap year
        last_processed_date: '2026-02-28',
        recurring_frequency: 'yearly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'yearly-tx-1')
    expect(processed).toBeDefined()
  })

  it('yearly: fires on Feb 29 in a leap year for a Feb 29 transaction', async () => {
    // Feb 29, 2028 (leap year)
    jest.setSystemTime(new Date(2028, 1, 29, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        id: 'yearly-tx-1',
        date: '2024-02-29',
        last_processed_date: '2027-02-28',
        recurring_frequency: 'yearly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'yearly-tx-1')
    expect(processed).toBeDefined()
  })

  it('yearly: does NOT fire in wrong month', async () => {
    // Mar 28, 2027 — wrong month for a Feb 29 yearly
    jest.setSystemTime(new Date(2027, 2, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        id: 'yearly-tx-1',
        date: '2024-02-29',
        last_processed_date: '2026-02-28',
        recurring_frequency: 'yearly',
      }),
    ]

    const result = await processRecurringTransactions()
    const processed = result.processedTransactions.find(t => t.originalId === 'yearly-tx-1')
    expect(processed).toBeUndefined()
  })

  // ─── Rollback on partial failure (BUG-009) ────────────────────────────

  it('rollback: deletes inserted transaction if last_processed_date update fails', async () => {
    jest.setSystemTime(new Date(2026, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-01-31',
        recurring_frequency: 'monthly',
      }),
    ]

    // Simulate a transient DB failure on the update step
    mockUpdateError = { message: 'transient db error' }

    const result = await processRecurringTransactions()

    // A transaction was inserted...
    expect(mockInsertedRows.length).toBe(1)
    // ...and then rolled back via delete
    expect(mockDeletedIds).toContain(mockInsertedRows[0].id)
    // Not counted as processed
    expect(result.processedTransactions.length).toBe(0)
    // Surfaced as an error
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].error).toContain('rolled back')
  })

  it('rollback: logs critical error if rollback delete also fails', async () => {
    jest.setSystemTime(new Date(2026, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-01-31',
        recurring_frequency: 'monthly',
      }),
    ]

    mockUpdateError = { message: 'update failed' }
    mockDeleteError = { message: 'delete also failed' }

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await processRecurringTransactions()

    // Insert + rollback attempt both happened
    expect(mockInsertedRows.length).toBe(1)
    expect(mockDeletedIds.length).toBe(1)
    // Critical log about the orphaned transaction
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CRITICAL] Failed to roll back'),
      expect.any(Object)
    )
    // Still surfaced as an error
    expect(result.errors.length).toBe(1)

    consoleErrorSpy.mockRestore()
  })

  it('rollback: no rollback happens when update succeeds', async () => {
    jest.setSystemTime(new Date(2026, 1, 28, 12, 0, 0))

    mockTransactions = [
      makeRecurringTransaction({
        date: '2026-01-31',
        last_processed_date: '2026-01-31',
        recurring_frequency: 'monthly',
      }),
    ]

    const result = await processRecurringTransactions()

    expect(mockInsertedRows.length).toBe(1)
    expect(mockDeletedIds.length).toBe(0)
    expect(result.processedTransactions.length).toBe(1)
    expect(result.errors.length).toBe(0)
  })
})
