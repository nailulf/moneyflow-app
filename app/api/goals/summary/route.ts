import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGoalProgress } from '@/lib/goals/calculations'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'
import { computeGoalWaterfall } from '@/lib/goals/waterfall'
import { AccountDB, FinancialGoalDB } from '@/types/database'

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

    // Fetch all transactions for this user once to avoid N+1 queries.
    // No currency-rate map is passed to calculateAccountBalanceAtDate: goal accounts are
    // effectively single-currency; the rare foreign-currency transaction falls back to its
    // raw amount — acceptable for goal progress and avoids pulling in exchange-rate fetching.
    const { data: allUserTxns } = await supabase
      .from('transactions')
      .select('amount, type, date, account_id, to_account_id, currency')
      .eq('user_id', user.id)

    const now = new Date()

    type JoinedAccount = {
      id: string
      user_id: string
      name: string
      balance: number
      type: AccountDB['type']
      currency: string
    }

    // Compute each account's live balance once (opening anchor + Σ transactions).
    const accountBalanceCache = new Map<string, number>()
    const accountMeta = new Map<string, JoinedAccount>()
    for (const item of goalsWithAccounts || []) {
      const account = item.accounts as unknown as JoinedAccount
      accountMeta.set(account.id, account)
      if (!accountBalanceCache.has(account.id)) {
        const accountTxns = (allUserTxns || []).filter(
          (t) => t.account_id === account.id || t.to_account_id === account.id
        )
        const currentBalance = calculateAccountBalanceAtDate(
          accountTxns, now, account.type, account.balance ?? 0, account.id, account.currency || 'IDR'
        )
        accountBalanceCache.set(account.id, currentBalance)
      }
    }

    // Group goals by account and apply the balance-waterfall so each ACTIVE goal's
    // currentAmount is its waterfall `saved` (goal N only fills after 1..N-1 are full).
    const goalsByAccount = new Map<string, FinancialGoalDB[]>()
    for (const item of goalsWithAccounts || []) {
      const accountId = (item.accounts as unknown as JoinedAccount).id
      const list = goalsByAccount.get(accountId) || []
      list.push(item as unknown as FinancialGoalDB)
      goalsByAccount.set(accountId, list)
    }

    // savedByGoalId holds the waterfall `saved` for each active goal.
    const savedByGoalId = new Map<string, number>()
    for (const [accountId, accountGoals] of goalsByAccount) {
      const balance = accountBalanceCache.get(accountId) ?? 0
      for (const w of computeGoalWaterfall(balance, accountGoals)) {
        savedByGoalId.set(w.goal.id, w.saved)
      }
    }

    // Process goals and calculate progress using the waterfall saved
    const goals = (goalsWithAccounts || []).map((item) => {
      const account = accountMeta.get(
        (item.accounts as unknown as JoinedAccount).id
      ) as JoinedAccount

      // Active goals get their waterfall saved. Non-active goals must NOT inject the
      // full account balance (that double-counts a shared account across its goals):
      // completed → its target_amount, cancelled → 0.
      const currentAmount =
        item.status === 'active'
          ? (savedByGoalId.get(item.id) ?? 0)
          : item.status === 'completed'
            ? item.target_amount
            : 0
      const progress = calculateGoalProgress(currentAmount, item.target_amount)

      return {
        id: item.id,
        name: item.name,
        goalType: item.goal_type,
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        currency: account.currency,
        currentAmount,
        targetAmount: item.target_amount,
        progressPercentage: progress.progress_percentage,
        amountRemaining: progress.amount_remaining,
        targetDate: item.target_date,
        status: item.status,
        createdAt: item.created_at
      }
    })

    // Total savings ("Total Terkumpul") = money currently allocated to ACTIVE goals,
    // i.e. the sum of active goals' waterfall `saved`. Non-active goals are excluded so
    // a shared account balance is never double-counted across its goals.
    const totalSavings = goals
      .filter((goal) => goal.status === 'active')
      .reduce((sum, goal) => sum + goal.currentAmount, 0)

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
