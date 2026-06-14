import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGoalProgress } from '@/lib/goals/calculations'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'
import { AccountDB, FinancialGoalInsert, FinancialGoalUpdate, GoalType } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface RouteParams {
  params: Promise<{ accountId: string }>
}

/** Fetch an account's transactions and compute its live balance.
 *  No currency-rate map is passed: goal accounts are effectively single-currency,
 *  and the rare foreign-currency transaction falls back to its raw amount — acceptable for goal progress.
 */
async function computeCurrentBalance(
  supabase: SupabaseClient<Database>,
  account: { id: string; user_id: string; balance: number; type: AccountDB['type']; currency: string }
): Promise<number> {
  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, type, date, account_id, to_account_id, currency')
    .eq('user_id', account.user_id)
    .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
  return calculateAccountBalanceAtDate(
    txns || [],
    new Date(),
    account.type,
    account.balance,
    account.id,
    account.currency || 'IDR'
  )
}

// GET /api/accounts/[accountId]/goal - Get goal for specific account
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user and get balance
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id, balance, type, currency')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get goal for this account
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (goalError && goalError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[Goal API] Error fetching goal:', goalError)
      return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 })
    }

    // If no goal, return null
    if (!goal) {
      return NextResponse.json({ goal: null, progress: null })
    }

    // Calculate progress using computed live balance (opening anchor + Σ transactions)
    const currentBalance = await computeCurrentBalance(supabase, {
      ...account,
      type: account.type as AccountDB['type'],
      currency: account.currency || 'IDR',
    })
    const progress = calculateGoalProgress(currentBalance, goal.target_amount)

    return NextResponse.json({ goal, progress })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/accounts/[accountId]/goal - Create goal for account
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user and get balance
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id, balance, type, currency')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow goals for BANK and INVESTMENT accounts
    if (!['BANK', 'INVESTMENT'].includes(account.type)) {
      return NextResponse.json(
        { error: 'Goals can only be set for bank and investment accounts' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, goalType, targetAmount, targetDate } = body

    // Validate required fields
    if (!name || !goalType || !targetAmount || !targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, goalType, targetAmount, targetDate' },
        { status: 400 }
      )
    }

    // Validate target amount
    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number' },
        { status: 400 }
      )
    }

    // Parse target date - convert MM/YYYY to ISO date
    let isoTargetDate: string
    if (targetDate.includes('/')) {
      const [month, year] = targetDate.split('/')
      isoTargetDate = `${year}-${month.padStart(2, '0')}-01`
    } else {
      isoTargetDate = targetDate
    }

    // Create goal
    const goalData: FinancialGoalInsert = {
      account_id: accountId,
      name,
      goal_type: goalType as GoalType,
      target_amount: targetAmount,
      target_date: isoTargetDate,
      status: 'active'
    }

    const { data: goal, error: createError } = await supabase
      .from('financial_goals')
      .insert(goalData)
      .select()
      .single()

    if (createError) {
      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A goal already exists for this account' },
          { status: 409 }
        )
      }
      console.error('[Goal API] Error creating goal:', createError)
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
    }

    // Calculate progress using computed live balance (opening anchor + Σ transactions)
    const currentBalance = await computeCurrentBalance(supabase, {
      ...account,
      type: account.type as AccountDB['type'],
      currency: account.currency || 'IDR',
    })
    const progress = calculateGoalProgress(currentBalance, goal.target_amount)

    return NextResponse.json({ goal, progress }, { status: 201 })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/accounts/[accountId]/goal - Update goal
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id, balance, type, currency')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get existing goal
    const { data: existingGoal, error: goalError } = await supabase
      .from('financial_goals')
      .select('id')
      .eq('account_id', accountId)
      .single()

    if (goalError || !existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { name, targetAmount, targetDate, status } = body

    // Build update object
    const updateData: FinancialGoalUpdate = {}
    if (name !== undefined) updateData.name = name
    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return NextResponse.json(
          { error: 'Target amount must be a positive number' },
          { status: 400 }
        )
      }
      updateData.target_amount = targetAmount
    }
    if (targetDate !== undefined) {
      // Parse target date - convert MM/YYYY to ISO date
      if (targetDate.includes('/')) {
        const [month, year] = targetDate.split('/')
        updateData.target_date = `${year}-${month.padStart(2, '0')}-01`
      } else {
        updateData.target_date = targetDate
      }
    }
    if (status !== undefined) updateData.status = status

    // Update goal
    const { data: goal, error: updateError } = await supabase
      .from('financial_goals')
      .update(updateData)
      .eq('id', existingGoal.id)
      .select()
      .single()

    if (updateError) {
      console.error('[Goal API] Error updating goal:', updateError)
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }

    // Calculate progress using computed live balance (opening anchor + Σ transactions)
    const currentBalance = await computeCurrentBalance(supabase, {
      ...account,
      type: account.type as AccountDB['type'],
      currency: account.currency || 'IDR',
    })
    const progress = calculateGoalProgress(currentBalance, goal.target_amount)

    return NextResponse.json({ goal, progress })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/accounts/[accountId]/goal - Delete goal
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete goal
    const { error: deleteError } = await supabase
      .from('financial_goals')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('[Goal API] Error deleting goal:', deleteError)
      return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
