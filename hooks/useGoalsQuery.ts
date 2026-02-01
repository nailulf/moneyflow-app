import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FinancialGoalDB, GoalType } from '@/types/database'
import { GoalProgress } from '@/lib/goals/calculations'

// Query key factory
export const goalKeys = {
  all: ['goals'] as const,
  summary: () => [...goalKeys.all, 'summary'] as const,
  account: (accountId: string) => [...goalKeys.all, 'account', accountId] as const,
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

// Fetch goal for a specific account
async function fetchAccountGoal(accountId: string): Promise<GoalWithProgress> {
  const response = await fetch(`/api/accounts/${accountId}/goal`)
  if (!response.ok) {
    const error = await response.json()
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

// Update goal for account
async function updateGoal(accountId: string, data: UpdateGoalInput): Promise<GoalWithProgress> {
  const response = await fetch(`/api/accounts/${accountId}/goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update goal')
  }
  return response.json()
}

// Delete goal for account
async function deleteGoal(accountId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/accounts/${accountId}/goal`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete goal')
  }
  return response.json()
}

// Hook: Get goal for specific account
export function useAccountGoal(accountId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: goalKeys.account(accountId),
    queryFn: () => fetchAccountGoal(accountId),
    enabled: options?.enabled !== false && !!accountId,
    staleTime: 30 * 1000, // 30 seconds
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

// Hook: Create goal
export function useCreateGoal(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGoalInput) => createGoal(accountId, data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: goalKeys.account(accountId) })
      queryClient.invalidateQueries({ queryKey: goalKeys.summary() })
      toast.success('Goal created successfully!')
    },
    onError: (error: Error) => {
      console.error('Error creating goal:', error)
      toast.error(error.message || 'Failed to create goal')
    }
  })
}

// Hook: Update goal
export function useUpdateGoal(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateGoalInput) => updateGoal(accountId, data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: goalKeys.account(accountId) })
      queryClient.invalidateQueries({ queryKey: goalKeys.summary() })
      toast.success('Goal updated successfully!')
    },
    onError: (error: Error) => {
      console.error('Error updating goal:', error)
      toast.error(error.message || 'Failed to update goal')
    }
  })
}

// Hook: Delete goal
export function useDeleteGoal(accountId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteGoal(accountId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: goalKeys.account(accountId) })
      queryClient.invalidateQueries({ queryKey: goalKeys.summary() })
      toast.success('Goal removed successfully')
    },
    onError: (error: Error) => {
      console.error('Error deleting goal:', error)
      toast.error(error.message || 'Failed to remove goal')
    }
  })
}

// Hook: Combined actions for goal management
export function useGoalActions(accountId: string) {
  const createMutation = useCreateGoal(accountId)
  const updateMutation = useUpdateGoal(accountId)
  const deleteMutation = useDeleteGoal(accountId)

  return {
    createGoal: (data: CreateGoalInput) => createMutation.mutateAsync(data),
    updateGoal: (data: UpdateGoalInput) => updateMutation.mutateAsync(data),
    deleteGoal: () => deleteMutation.mutateAsync(),
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
