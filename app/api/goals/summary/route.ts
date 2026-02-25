import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGoalProgress } from '@/lib/goals/calculations'
import { AccountDB } from '@/types/database'

// GET /api/goals/summary - Get all user goals with progress
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active goals for user's accounts
    const { data: goalsWithAccounts, error: goalsError } = await supabase
      .from('financial_goals')
      .select(`
        id,
        account_id,
        name,
        goal_type,
        target_amount,
        target_date,
        status,
        created_at,
        updated_at,
        accounts!inner (
          id,
          user_id,
          name,
          balance,
          type,
          currency
        )
      `)
      .eq('accounts.user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('[Goals Summary API] Error fetching goals:', goalsError)
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
    }

    // Process goals and calculate progress
    const goals = (goalsWithAccounts || []).map((item) => {
      // TypeScript needs help with the joined data
      const account = item.accounts as unknown as {
        id: string
        user_id: string
        name: string
        balance: number
        type: AccountDB['type']
        currency: string
      }

      const currentBalance = account.balance ?? 0
      const progress = calculateGoalProgress(currentBalance, item.target_amount)

      return {
        id: item.id,
        name: item.name,
        goalType: item.goal_type,
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currency: account.currency,
        currentAmount: currentBalance,
        targetAmount: item.target_amount,
        progressPercentage: progress.progress_percentage,
        amountRemaining: progress.amount_remaining,
        targetDate: item.target_date,
        status: item.status,
        createdAt: item.created_at
      }
    })

    // Calculate total savings (sum of all account balances that have goals)
    const totalSavings = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)

    // Separate active and completed goals
    const activeGoals = goals.filter(g => g.status === 'active')
    const completedGoals = goals.filter(g => g.status === 'completed')

    return NextResponse.json({
      totalSavings,
      goals: activeGoals,
      completedGoals,
      totalGoalsCount: goals.length,
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: completedGoals.length
    })
  } catch (error) {
    console.error('[Goals Summary API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
