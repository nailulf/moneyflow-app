import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AccountDB, FinancialGoalDB, GoalType } from '@/types/database'
import { GoalProgress } from '@/lib/goals/calculations'
import { computeGoalWaterfall, GoalWithSaved } from '@/lib/goals/waterfall'
import { useAccounts, AccountWithHistory } from '@/contexts/AccountContext'
import { queryKeys } from '@/hooks/useDataRefresh'

// Query key factory
export const goalKeys = {
  all: ['goals'] as const,
  summary: () => [...goalKeys.all, 'summary'] as const,
  account: (accountId: string) => [...goalKeys.all, 'account', accountId] as const,
  list: (accountId: string) => [...goalKeys.all, 'list', accountId] as const,
  detail: (goalId: string) => [...goalKeys.all, 'detail', goalId] as const,
  allList: () => [...goalKeys.all, 'list', 'all'] as const,
}

// Resolve an account's live waterfall balance (currentBalance ?? balance).
function accountBalance(account: AccountWithHistory | undefined): number {
  if (!account) return 0
  return account.currentBalance ?? account.balance ?? 0
}

// Types for API responses
export interface GoalWithProgress {
  goal: FinancialGoalDB | null
  progress: GoalProgress | null
}

export interface GoalSummaryItem {
  id: string
  name: string
  goalType: GoalType
  accountId: string
  accountName: string
  accountType: string
  currency: string
  currentAmount: number
  targetAmount: number
  progressPercentage: number
  amountRemaining: number
  targetDate: string
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
}

export interface GoalsSummary {
  totalSavings: number
  goals: GoalSummaryItem[]
  completedGoals: GoalSummaryItem[]
  totalGoalsCount: number
  activeGoalsCount: number
  completedGoalsCount: number
}

export interface CreateGoalInput {
  name: string
  goalType: GoalType
  targetAmount: number
  targetDate: string // MM/YYYY format
}

export interface UpdateGoalInput {
  name?: string
  targetAmount?: number
  targetDate?: string
  status?: 'active' | 'completed' | 'cancelled'
}

// Fetch ALL goals for a specific account (GET now returns an array)
async function fetchAccountGoals(accountId: string): Promise<FinancialGoalDB[]> {
  const response = await fetch(`/api/accounts/${accountId}/goal`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch goals')
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

// Fetch a single goal (+ its account) by goal id
interface GoalDetailResponse {
  goal: FinancialGoalDB
  account: AccountDB
}
async function fetchGoal(goalId: string): Promise<GoalDetailResponse> {
  const response = await fetch(`/api/goals/${goalId}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to fetch goal')
  }
  return response.json()
}

// Fetch goals summary
async function fetchGoalsSummary(): Promise<GoalsSummary> {
  const response = await fetch('/api/goals/summary')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch goals summary')
  }
  return response.json()
}

// Create goal for account
async function createGoal(accountId: string, data: CreateGoalInput): Promise<GoalWithProgress> {
  const response = await fetch(`/api/accounts/${accountId}/goal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create goal')
  }
  return response.json()
}

// Update a goal by goal id (new goalId-keyed endpoint)
async function updateGoalById(goalId: string, data: UpdateGoalInput): Promise<{ goal: FinancialGoalDB }> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to update goal')
  }
  return response.json()
}

// Delete a goal by goal id (new goalId-keyed endpoint)
async function deleteGoalById(goalId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/goals/${goalId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'Failed to delete goal')
  }
  return response.json()
}

// Hook: Get goal for specific account (LEGACY single-goal contract).
// GET now returns an array; adapt by taking the earliest goal and computing
// its progress against the account's live balance so existing callers keep working.
export function useAccountGoal(accountId: string, options?: { enabled?: boolean }) {
  const { accounts } = useAccounts()
  const account = accounts.find((a) => a.id === accountId)
  const balance = accountBalance(account)

  return useQuery<FinancialGoalDB[], Error, GoalWithProgress>({
    queryKey: goalKeys.list(accountId),
    queryFn: () => fetchAccountGoals(accountId),
    enabled: options?.enabled !== false && !!accountId,
    staleTime: 30 * 1000, // 30 seconds
    select: (goals) => {
      const goal = goals[0] ?? null // GET orders by target_date asc, created_at asc → earliest first
      if (!goal) return { goal: null, progress: null }
      const progress: GoalProgress = (() => {
        const current = Math.min(Math.max(0, balance), goal.target_amount)
        const target = goal.target_amount
        const remaining = Math.max(0, target - current)
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
        return {
          current_amount: balance,
          target_amount: target,
          amount_remaining: remaining,
          progress_percentage: pct,
          is_completed: balance >= target,
        }
      })()
      return { goal, progress }
    },
  })
}

// Hook: Get ALL active goals for an account, each with waterfall `saved`,
// using the account's live balance from AccountContext.
export function useAccountGoals(accountId: string, options?: { enabled?: boolean }) {
  const { accounts } = useAccounts()
  const account = accounts.find((a) => a.id === accountId)
  const balance = accountBalance(account)

  return useQuery<FinancialGoalDB[], Error, GoalWithSaved[]>({
    queryKey: goalKeys.list(accountId),
    queryFn: () => fetchAccountGoals(accountId),
    enabled: options?.enabled !== false && !!accountId,
    staleTime: 30 * 1000,
    select: (goals) => computeGoalWaterfall(balance, goals),
  })
}

export interface AllGoalsItem extends GoalWithSaved {
  account: AccountDB
}
export interface AllGoalsResult {
  items: AllGoalsItem[]
  totalSaved: number
  totalTarget: number
  activeCount: number
}

// Hook: Get every account's goals (waterfall-applied), aggregated across accounts.
export function useAllGoals(options?: { enabled?: boolean }) {
  const { accounts } = useAccounts()
  const accountsWithGoals = accounts.filter((a) => ['BANK', 'INVESTMENT'].includes(a.type))

  return useQuery<AllGoalsResult>({
    queryKey: [...goalKeys.allList(), accountsWithGoals.map((a) => a.id).sort().join(',')],
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const perAccount = await Promise.all(
        accountsWithGoals.map(async (account) => {
          const goals = await fetchAccountGoals(account.id)
          const waterfall = computeGoalWaterfall(accountBalance(account), goals)
          return waterfall.map((w) => ({ ...w, account: account as AccountDB }))
        })
      )
      const items = perAccount.flat()
      const totalSaved = items.reduce((sum, it) => sum + it.saved, 0)
      const totalTarget = items.reduce((sum, it) => sum + Number(it.goal.target_amount), 0)
      return { items, totalSaved, totalTarget, activeCount: items.length }
    },
  })
}

// Hook: Get a single goal (+ account), with waterfall saved/isCompleted derived
// from the account's live balance and all of that account's goals.
export function useGoal(goalId: string, options?: { enabled?: boolean }) {
  const { accounts } = useAccounts()

  return useQuery({
    queryKey: goalKeys.detail(goalId),
    enabled: options?.enabled !== false && !!goalId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { goal, account } = await fetchGoal(goalId)
      // Pull the live account balance from context when available, else the row balance.
      const liveAccount = accounts.find((a) => a.id === account.id)
      const balance = liveAccount ? accountBalance(liveAccount) : (account.balance ?? 0)
      const goals = await fetchAccountGoals(account.id)
      const waterfall = computeGoalWaterfall(balance, goals)
      const entry = waterfall.find((w) => w.goal.id === goalId)
      return {
        goal,
        account,
        saved: entry?.saved ?? 0,
        isCompleted: entry?.isCompleted ?? false,
      }
    },
  })
}

// Hook: Get goals summary
export function useGoalsSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: goalKeys.summary(),
    queryFn: fetchGoalsSummary,
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Shared invalidation: refresh all goal queries + the account list (balances
// drive the waterfall, so the account list must re-evaluate too). Using the
// ['accounts'] prefix invalidates every per-user account query (partial match).
function useInvalidateGoals() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: goalKeys.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
  }
}

// Hook: Create goal (keyed by accountId — POST /api/accounts/[id]/goal)
export function useCreateGoal(accountId: string) {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: (data: CreateGoalInput) => createGoal(accountId, data),
    onSuccess: () => {
      invalidate()
      toast.success('Goal created successfully!')
    },
    onError: (error: Error) => {
      console.error('Error creating goal:', error)
      toast.error(error.message || 'Failed to create goal')
    }
  })
}

// Hook: Update goal (keyed by goalId — PUT /api/goals/[goalId])
export function useUpdateGoal(goalId: string) {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: (data: UpdateGoalInput) => updateGoalById(goalId, data),
    onSuccess: () => {
      invalidate()
      toast.success('Goal updated successfully!')
    },
    onError: (error: Error) => {
      console.error('Error updating goal:', error)
      toast.error(error.message || 'Failed to update goal')
    }
  })
}

// Hook: Delete goal (keyed by goalId — DELETE /api/goals/[goalId])
export function useDeleteGoal(goalId: string) {
  const invalidate = useInvalidateGoals()

  return useMutation({
    mutationFn: () => deleteGoalById(goalId),
    onSuccess: () => {
      invalidate()
      toast.success('Goal removed successfully')
    },
    onError: (error: Error) => {
      console.error('Error deleting goal:', error)
      toast.error(error.message || 'Failed to remove goal')
    }
  })
}
