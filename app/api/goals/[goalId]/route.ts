import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AccountDB, FinancialGoalDB, FinancialGoalUpdate } from '@/types/database'

interface RouteParams {
  params: Promise<{ goalId: string }>
}

/**
 * Load a goal by id together with its owning account, enforcing that the
 * authenticated user owns the account (mirrors the ownership pattern in
 * app/api/accounts/[accountId]/goal/route.ts). Returns a typed result or an
 * error NextResponse to short-circuit the handler.
 */
async function loadOwnedGoal(
  goalId: string
): Promise<
  | { error: NextResponse }
  | { goal: FinancialGoalDB; account: AccountDB }
> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Join the account so we can both verify ownership and return it.
  const { data: goal, error: goalError } = await supabase
    .from('financial_goals')
    .select('*, accounts!inner ( * )')
    .eq('id', goalId)
    .single()

  if (goalError || !goal) {
    return { error: NextResponse.json({ error: 'Goal not found' }, { status: 404 }) }
  }

  const account = (goal as unknown as { accounts: AccountDB }).accounts
  if (!account || account.user_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Strip the embedded join off the goal row before returning it.
  const { accounts: _accounts, ...goalRow } = goal as unknown as Record<string, unknown>
  return { goal: goalRow as unknown as FinancialGoalDB, account }
}

// GET /api/goals/[goalId] - one goal + its account
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { goalId } = await context.params
    const result = await loadOwnedGoal(goalId)
    if ('error' in result) return result.error
    return NextResponse.json({ goal: result.goal, account: result.account })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/goals/[goalId] - update a goal by id
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { goalId } = await context.params
    const result = await loadOwnedGoal(goalId)
    if ('error' in result) return result.error

    const body = await request.json()
    const { name, targetAmount, targetDate, status } = body

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
      // Convert MM/YYYY to the ISO month-END date (last day of the month).
      if (typeof targetDate === 'string' && targetDate.includes('/')) {
        const [month, year] = targetDate.split('/')
        const lastDay = new Date(Number(year), Number(month), 0)
        const mm = String(lastDay.getMonth() + 1).padStart(2, '0')
        const dd = String(lastDay.getDate()).padStart(2, '0')
        updateData.target_date = `${lastDay.getFullYear()}-${mm}-${dd}`
      } else {
        updateData.target_date = targetDate
      }
    }
    if (status !== undefined) updateData.status = status

    const supabase = await createClient()
    const { data: goal, error: updateError } = await supabase
      .from('financial_goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single()

    if (updateError) {
      console.error('[Goal API] Error updating goal:', updateError)
      return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('[Goal API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/goals/[goalId] - delete a goal by id
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { goalId } = await context.params
    const result = await loadOwnedGoal(goalId)
    if ('error' in result) return result.error

    const supabase = await createClient()
    const { error: deleteError } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId)

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
