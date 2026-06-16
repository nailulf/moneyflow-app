import type {
  UserOnboardingDB,
  UserOnboardingUpdate,
  OnboardingEventDB,
  OnboardingEventInsert,
  BudgetTemplateDB,
  OnboardingPhase,
  OnboardingEventType
} from '@/types/database'

// Request deduplication cache
const requestCache = new Map<string, Promise<UserOnboardingDB | null>>()
const dataCache = new Map<string, { data: unknown, timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Fetches the onboarding state for a user
 */
export async function getOnboardingStatus(userId: string): Promise<UserOnboardingDB | null> {
  const cacheKey = `onboarding-${userId}`

  // Check data cache first
  const cached = dataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as UserOnboardingDB | null
  }

  // Check if request is already in progress
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/onboarding?userId=${userId}`)

      if (!response.ok) {
        const error = await response.json()
        console.error('Error fetching onboarding status:', error)
        throw new Error('Failed to fetch onboarding status')
      }

      const data = await response.json()

      // Cache the result
      dataCache.set(cacheKey, { data, timestamp: Date.now() })

      return data
    } finally {
      // Remove from request cache when done
      requestCache.delete(cacheKey)
    }
  })()

  // Add to request cache
  requestCache.set(cacheKey, requestPromise)

  return requestPromise
}

/**
 * Updates the onboarding state for a user
 */
export async function updateOnboarding(
  userId: string,
  updates: UserOnboardingUpdate
): Promise<UserOnboardingDB> {
  const response = await fetch('/api/onboarding', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...updates }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating onboarding:', error)
    throw new Error('Failed to update onboarding')
  }

  const data = await response.json()

  // Invalidate cache
  dataCache.delete(`onboarding-${userId}`)

  return data
}

/**
 * Advances the onboarding to the next phase
 */
export async function advanceOnboardingPhase(
  userId: string,
  nextPhase: OnboardingPhase
): Promise<UserOnboardingDB> {
  return updateOnboarding(userId, {
    current_phase: nextPhase,
    current_step: 0
  })
}

/**
 * Marks onboarding as skipped
 */
export async function skipOnboarding(
  userId: string,
  reason?: string
): Promise<{ success: boolean; onboarding: UserOnboardingDB }> {
  const response = await fetch('/api/onboarding/skip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, reason }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error skipping onboarding:', error)
    throw new Error('Failed to skip onboarding')
  }

  // Invalidate cache
  dataCache.delete(`onboarding-${userId}`)

  return response.json()
}

/**
 * Marks onboarding as completed
 */
export async function completeOnboarding(
  userId: string,
  summary?: Record<string, unknown>
): Promise<{
  success: boolean
  onboarding: UserOnboardingDB
  summary: {
    accountsCreated: number
    categoriesCount: number
    budgetsCreated: number
    durationSeconds: number
  }
}> {
  const response = await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, summary }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error completing onboarding:', error)
    throw new Error('Failed to complete onboarding')
  }

  // Invalidate cache
  dataCache.delete(`onboarding-${userId}`)

  return response.json()
}

/**
 * Logs an onboarding analytics event
 */
export async function logOnboardingEvent(
  userId: string,
  eventType: OnboardingEventType,
  options?: {
    phase?: string
    step?: number
    metadata?: Record<string, unknown>
  }
): Promise<OnboardingEventDB> {
  const response = await fetch('/api/onboarding/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      eventType,
      phase: options?.phase,
      step: options?.step,
      metadata: options?.metadata
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error logging onboarding event:', error)
    throw new Error('Failed to log onboarding event')
  }

  return response.json()
}

/**
 * Fetches onboarding events for a user
 */
export async function getOnboardingEvents(
  userId: string,
  limit?: number
): Promise<OnboardingEventDB[]> {
  const url = new URL('/api/onboarding/events', window.location.origin)
  url.searchParams.set('userId', userId)
  if (limit) {
    url.searchParams.set('limit', limit.toString())
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching onboarding events:', error)
    throw new Error('Failed to fetch onboarding events')
  }

  return response.json()
}

/**
 * Fetches available budget templates
 */
export async function getBudgetTemplates(): Promise<BudgetTemplateDB[]> {
  const cacheKey = 'budget-templates'

  // Check data cache first
  const cached = dataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as BudgetTemplateDB[]
  }

  const response = await fetch('/api/budget-templates')

  if (!response.ok) {
    const error = await response.json()
    console.error('Error fetching budget templates:', error)
    throw new Error('Failed to fetch budget templates')
  }

  const data = await response.json()

  // Cache the result
  dataCache.set(cacheKey, { data, timestamp: Date.now() })

  return data
}

/**
 * Clears the onboarding cache (useful when needing fresh data)
 */
export function clearOnboardingCache(userId?: string) {
  if (userId) {
    dataCache.delete(`onboarding-${userId}`)
  } else {
    // Clear all onboarding-related caches
    for (const key of dataCache.keys()) {
      if (key.startsWith('onboarding-')) {
        dataCache.delete(key)
      }
    }
  }
}

/**
 * Helper to determine if user needs onboarding
 */
export function needsOnboarding(onboarding: UserOnboardingDB | null): boolean {
  if (!onboarding) return true
  return !onboarding.is_completed && !onboarding.is_skipped
}

/**
 * Helper to get the onboarding phase order (guest funnel, linear)
 *
 * NOTE: `health_check` is a SIDE-BRANCH entered directly by route and is
 * intentionally NOT part of this linear order. As a result
 * `getNextPhase('health_check')` returning `null` is acceptable — navigation
 * out of the health check is handled explicitly by its route, not the machine.
 */
export const ONBOARDING_PHASES: OnboardingPhase[] = ['intent', 'goal_setup', 'plan', 'conversion', 'completed']

/**
 * Gets the next phase in the onboarding flow
 */
export function getNextPhase(currentPhase: OnboardingPhase): OnboardingPhase | null {
  const currentIndex = ONBOARDING_PHASES.indexOf(currentPhase)
  if (currentIndex === -1 || currentIndex >= ONBOARDING_PHASES.length - 1) {
    return null
  }
  return ONBOARDING_PHASES[currentIndex + 1]
}

/**
 * Gets the previous phase in the onboarding flow
 */
export function getPreviousPhase(currentPhase: OnboardingPhase): OnboardingPhase | null {
  const currentIndex = ONBOARDING_PHASES.indexOf(currentPhase)
  if (currentIndex <= 0) {
    return null
  }
  return ONBOARDING_PHASES[currentIndex - 1]
}
