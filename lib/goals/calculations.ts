import { differenceInMonths, differenceInDays, parse, startOfMonth, isAfter } from 'date-fns'

export interface GoalProgress {
  current_amount: number
  target_amount: number
  progress_percentage: number
  amount_remaining: number
  is_completed: boolean
}

export interface TimeProgress {
  months_remaining: number
  days_remaining: number
  is_overdue: boolean
  time_progress_percentage: number
}

export interface GoalTrackingStatus {
  on_track: boolean
  status: 'ahead' | 'on_track' | 'behind' | 'overdue'
  variance_percentage: number
}

export interface RequiredSavings {
  required_monthly: number
  required_daily: number
  is_achievable: boolean
}

/**
 * Parse target date string (YYYY-MM-DD or MM/YYYY) to Date
 */
export function parseTargetDate(targetDate: string): Date {
  // Handle ISO date format (YYYY-MM-DD) from database
  if (targetDate.includes('-')) {
    return new Date(targetDate)
  }
  // Handle MM/YYYY format from UI
  const [month, year] = targetDate.split('/')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
}

/**
 * Format date to MM/YYYY display format
 */
export function formatTargetDate(targetDate: string): string {
  const date = parseTargetDate(targetDate)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${year}`
}

/**
 * Calculate goal progress based on account balance and target amount
 */
export function calculateGoalProgress(
  accountBalance: number,
  targetAmount: number
): GoalProgress {
  const progressPercentage = Math.min(
    (accountBalance / targetAmount) * 100,
    100
  )

  return {
    current_amount: accountBalance,
    target_amount: targetAmount,
    progress_percentage: Math.round(progressPercentage * 10) / 10, // 1 decimal place
    amount_remaining: Math.max(targetAmount - accountBalance, 0),
    is_completed: accountBalance >= targetAmount
  }
}

/**
 * Calculate time progress towards target date
 */
export function calculateTimeProgress(
  targetDate: string,
  createdAt?: string
): TimeProgress {
  const target = parseTargetDate(targetDate)
  const now = new Date()

  const monthsRemaining = differenceInMonths(target, now)
  const daysRemaining = differenceInDays(target, now)
  const isOverdue = daysRemaining < 0

  // Calculate time elapsed percentage since goal creation
  let timeProgressPercentage = 0
  if (createdAt) {
    const startDate = new Date(createdAt)
    const totalDays = differenceInDays(target, startDate)
    const daysElapsed = differenceInDays(now, startDate)
    if (totalDays > 0) {
      timeProgressPercentage = Math.min((daysElapsed / totalDays) * 100, 100)
    }
  } else {
    // Default: assume 12 month goal from current date
    const startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 12, 1))
    const totalDays = differenceInDays(target, startDate)
    const daysElapsed = differenceInDays(now, startDate)
    if (totalDays > 0) {
      timeProgressPercentage = Math.min((daysElapsed / totalDays) * 100, 100)
    }
  }

  return {
    months_remaining: Math.max(monthsRemaining, 0),
    days_remaining: Math.max(daysRemaining, 0),
    is_overdue: isOverdue,
    time_progress_percentage: Math.round(timeProgressPercentage)
  }
}

/**
 * Determine if goal is on track based on progress vs time elapsed
 */
export function isGoalOnTrack(
  accountBalance: number,
  targetAmount: number,
  targetDate: string,
  createdAt?: string
): GoalTrackingStatus {
  const progress = calculateGoalProgress(accountBalance, targetAmount)
  const timeProgress = calculateTimeProgress(targetDate, createdAt)

  // If overdue, status is overdue
  if (timeProgress.is_overdue) {
    return {
      on_track: false,
      status: 'overdue',
      variance_percentage: progress.progress_percentage - 100
    }
  }

  // If goal is already completed
  if (progress.is_completed) {
    return {
      on_track: true,
      status: 'ahead',
      variance_percentage: progress.progress_percentage - timeProgress.time_progress_percentage
    }
  }

  // Compare money progress vs time progress
  const variance = progress.progress_percentage - timeProgress.time_progress_percentage

  let status: 'ahead' | 'on_track' | 'behind'
  if (variance > 10) {
    status = 'ahead'
  } else if (variance < -10) {
    status = 'behind'
  } else {
    status = 'on_track'
  }

  return {
    on_track: variance >= -10, // Within 10% is considered on track
    status,
    variance_percentage: Math.round(variance)
  }
}

/**
 * Calculate required monthly/daily savings to reach goal
 */
export function calculateRequiredSavings(
  currentBalance: number,
  targetAmount: number,
  targetDate: string
): RequiredSavings {
  const remaining = Math.max(targetAmount - currentBalance, 0)
  const timeProgress = calculateTimeProgress(targetDate)

  // If already completed
  if (remaining === 0) {
    return {
      required_monthly: 0,
      required_daily: 0,
      is_achievable: true
    }
  }

  // If overdue or no time left
  if (timeProgress.is_overdue || timeProgress.months_remaining <= 0) {
    return {
      required_monthly: remaining,
      required_daily: remaining / Math.max(timeProgress.days_remaining, 1),
      is_achievable: false
    }
  }

  const requiredMonthly = remaining / timeProgress.months_remaining
  const requiredDaily = timeProgress.days_remaining > 0
    ? remaining / timeProgress.days_remaining
    : remaining

  return {
    required_monthly: Math.ceil(requiredMonthly),
    required_daily: Math.ceil(requiredDaily),
    is_achievable: true
  }
}

/**
 * Get goal type icon emoji
 */
export function getGoalIcon(goalType: string): string {
  const icons: Record<string, string> = {
    emergency_fund: '🚨',
    vacation: '✈️',
    house_down_payment: '🏠',
    car_purchase: '🚗',
    education: '🎓',
    wedding: '💑',
    investment: '📈',
    other: '🎯'
  }
  return icons[goalType] || '🎯'
}

/**
 * Get goal type display label
 */
export function getGoalTypeLabel(goalType: string): string {
  const labels: Record<string, string> = {
    emergency_fund: 'Emergency Fund',
    vacation: 'Vacation',
    house_down_payment: 'House Down Payment',
    car_purchase: 'Car Purchase',
    education: 'Education',
    wedding: 'Wedding',
    investment: 'Investment',
    other: 'Other'
  }
  return labels[goalType] || 'Goal'
}

/**
 * Get progress bar color based on tracking status
 */
export function getProgressColor(status: string): string {
  switch (status) {
    case 'ahead':
      return 'bg-blue-500'
    case 'on_track':
      return 'bg-green-500'
    case 'behind':
      return 'bg-yellow-500'
    case 'overdue':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

/**
 * Get status badge variant based on tracking status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'ahead':
      return 'default'
    case 'on_track':
      return 'success'
    case 'behind':
      return 'warning'
    case 'overdue':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get status display text
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'ahead':
      return '🚀 Ahead of Schedule'
    case 'on_track':
      return '✓ On Track'
    case 'behind':
      return '⚠️ Behind Schedule'
    case 'overdue':
      return '⏰ Overdue'
    default:
      return 'Unknown'
  }
}
