'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { isDevToolsEnabled } from '@/lib/utils/environment'
import type {
  UserOnboardingDB,
  OnboardingPhase,
  AccountDB,
  BudgetTemplateDB
} from '@/types/database'
import {
  getOnboardingStatus,
  updateOnboarding,
  skipOnboarding,
  completeOnboarding,
  logOnboardingEvent,
  getNextPhase,
  getPreviousPhase,
  needsOnboarding,
  clearOnboardingCache,
  ONBOARDING_PHASES
} from '@/lib/api/onboarding'
import { preferences } from '@/lib/api/user-preferences'
import { createClient } from '@/lib/supabase/client'

/**
 * Wizard data collected during onboarding
 */
interface WizardData {
  account?: Partial<AccountDB>
  budget?: {
    templateId: string | null
    monthlyIncome: number
    allocations: Record<string, number>
  }
}

interface OnboardingContextType {
  // State
  state: UserOnboardingDB | null
  loading: boolean
  error: string | null

  // Computed
  needsOnboarding: boolean
  currentPhase: OnboardingPhase | null
  progress: number // 0-100
  isPreviewMode: boolean

  // Modal control
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void

  // Wizard data
  wizardData: WizardData
  setWizardData: (data: Partial<WizardData>) => void

  // Actions
  refresh: () => Promise<void>
  nextPhase: () => Promise<void>
  prevPhase: () => Promise<void>
  goToPhase: (phase: OnboardingPhase) => Promise<void>
  skip: (reason?: string) => Promise<void>
  complete: () => Promise<{
    accountsCreated: number
    categoriesCount: number
    budgetsCreated: number
    durationSeconds: number
  }>
  logEvent: (eventType: 'phase_started' | 'phase_completed' | 'step_completed', metadata?: Record<string, unknown>) => Promise<void>
  // Note: Amplitude events are normalised to onboarding_step_started / onboarding_step_completed
}

/**
 * Pure reconciliation decision for the client-side onboarding context.
 *
 * The guest funnel now starts with a trigger-seeded default account + categories
 * (and, mid-funnel, a seeded plan), so the *existence* of those rows must NOT be
 * treated as "the user finished onboarding". Completion is driven solely by the
 * funnel reaching its end (`completed` / `conversion`) WITH a real, user-created
 * budget plan.
 */
export interface ReconcileInput {
  state: UserOnboardingDB
  hasSeededAccount: boolean
  hasCategories: boolean
  hasUserCreatedPlan: boolean
}
export interface ReconcileResult { markComplete: boolean; advanceTo?: OnboardingPhase }
export function reconcileOnboarding(input: ReconcileInput): ReconcileResult {
  const { state, hasUserCreatedPlan } = input
  if (!state || state.is_completed || state.is_skipped) return { markComplete: false }
  // Completion is driven by reaching the end of the guest funnel WITH a real plan —
  // never by the mere existence of trigger-seeded account/categories.
  const reachedEnd = state.current_phase === 'completed' || state.current_phase === 'conversion'
  return { markComplete: reachedEnd && hasUserCreatedPlan }
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)
const DEV_ONBOARDING_MODE_KEY = 'dev_onboarding_preview'
const DEV_ONBOARDING_STATE_KEY = 'dev_onboarding_state'
const DEV_ONBOARDING_BYPASS_KEY = 'dev_onboarding_bypass_account_check'

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<UserOnboardingDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardData, setWizardDataState] = useState<WizardData>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const getPreviewKey = useCallback((userId: string) => `${DEV_ONBOARDING_MODE_KEY}_${userId}`, [])
  const getStateKey = useCallback((userId: string) => `${DEV_ONBOARDING_STATE_KEY}_${userId}`, [])
  const createLocalState = useCallback((userId: string, overrides: Partial<UserOnboardingDB> = {}): UserOnboardingDB => {
    const timestamp = new Date().toISOString()
    return {
      id: `local-${userId}`,
      user_id: userId,
      current_phase: 'welcome' as OnboardingPhase,
      current_step: 0,
      is_completed: false,
      is_skipped: false,
      completed_at: null,
      skipped_at: null,
      created_at: timestamp,
      updated_at: timestamp,
      ...overrides
    }
  }, [])

  const readLocalState = useCallback((userId: string) => {
    if (typeof window === 'undefined') {
      return createLocalState(userId)
    }
    const stored = localStorage.getItem(getStateKey(userId))
    if (!stored) {
      const initial = createLocalState(userId)
      localStorage.setItem(getStateKey(userId), JSON.stringify(initial))
      return initial
    }
    try {
      const parsed = JSON.parse(stored) as UserOnboardingDB
      return { ...createLocalState(userId), ...parsed }
    } catch {
      const initial = createLocalState(userId)
      localStorage.setItem(getStateKey(userId), JSON.stringify(initial))
      return initial
    }
  }, [createLocalState, getStateKey])

  const writeLocalState = useCallback((userId: string, nextState: UserOnboardingDB) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getStateKey(userId), JSON.stringify(nextState))
  }, [getStateKey])

  const applyLocalUpdate = useCallback((updates: Partial<UserOnboardingDB>) => {
    if (!user?.id) return null
    const base = readLocalState(user.id)
    const nextState = {
      ...base,
      ...updates,
      updated_at: new Date().toISOString()
    }
    writeLocalState(user.id, nextState)
    setState(nextState)
    return nextState
  }, [readLocalState, user?.id, writeLocalState])

  const resolvePreviewEnabled = useCallback(() => {
    if (!user?.id) return false
    if (!isDevToolsEnabled()) return false
    if (typeof window === 'undefined') return false
    const previewEnabled = localStorage.getItem(getPreviewKey(user.id)) === 'true'
    return previewEnabled
  }, [getPreviewKey, user?.id])

  const resolveBypassEnabled = useCallback(() => {
    if (!isDevToolsEnabled()) return false
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DEV_ONBOARDING_BYPASS_KEY) === 'true'
  }, [])

  useEffect(() => {
    setIsPreviewMode(resolvePreviewEnabled())
  }, [resolvePreviewEnabled])

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      const previewEnabled = resolvePreviewEnabled()
      setIsPreviewMode(previewEnabled)
      if (previewEnabled) {
        const localState = readLocalState(user.id)
        setState(localState)
      } else {
        const data = await getOnboardingStatus(user.id)

        // Client-side reconciliation: if the server says the user isn't done,
        // decide completion via the pure `reconcileOnboarding` rule. Completion is
        // driven by the user reaching the END of the guest funnel (`completed` /
        // `conversion`) WITH a real budget plan — NOT by the mere existence of the
        // trigger-seeded default account + categories (which every brand-new guest
        // already has). The plan row is never seeded by the DB trigger, so any
        // `budget_plans` row is user-created.
        let finalData = data
        if (data && !data.is_completed && !data.is_skipped) {
          try {
            const supabase = createClient()
            const [
              { count: accountCount },
              { count: categoryCount },
              { count: budgetCount },
            ] = await Promise.all([
              supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
              supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
              supabase.from('budget_plans').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            ])

            const decision = reconcileOnboarding({
              state: data,
              hasSeededAccount: (accountCount ?? 0) > 0,
              hasCategories: (categoryCount ?? 0) > 0,
              hasUserCreatedPlan: (budgetCount ?? 0) > 0,
            })

            if (decision.markComplete) {
              const { data: reconciled } = await supabase
                .from('user_onboarding')
                .update({
                  current_phase: 'completed',
                  current_step: 0,
                  is_completed: true,
                  is_skipped: false,
                  completed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .select()
                .single()
              if (reconciled) {
                finalData = reconciled as UserOnboardingDB
                clearOnboardingCache(user.id)
              }
            }
          } catch (reconcileErr) {
            console.warn('[onboarding] client-side reconciliation failed:', reconcileErr)
            // finalData stays as the original server data — will retry next load
          }
        }

        setState(finalData)

        // Sync user_metadata preferences (set during registration) → user_preferences table
        // This runs fire-and-forget so it doesn't block onboarding load
        if (finalData && !finalData.is_completed) {
          const meta = user.user_metadata
          if (meta?.preferred_currency) {
            preferences.getCurrency(user.id).then(saved => {
              if (!saved || saved === 'IDR') {
                preferences.setCurrency(user.id, meta.preferred_currency).catch(() => {})
              }
            }).catch(() => {})
          }
          if (meta?.country) {
            preferences.getCountry(user.id).then(saved => {
              if (!saved || saved === 'Indonesia') {
                preferences.setCountry(user.id, meta.country).catch(() => {})
              }
            }).catch(() => {})
          }
          if (meta?.user_goal) {
            preferences.getUserGoal(user.id).then(saved => {
              if (!saved) {
                preferences.setUserGoal(user.id, meta.user_goal).catch(() => {})
              }
            }).catch(() => {})
          }
        }
      }
    } catch (err) {
      console.error('Error fetching onboarding status:', err)
      setError('Failed to fetch onboarding status')
    } finally {
      setLoading(false)
    }
  }, [readLocalState, resolvePreviewEnabled, user?.id])

  // Fetch onboarding status when user changes
  useEffect(() => {
    if (user?.id) {
      fetchStatus()
    } else {
      setState(null)
      setLoading(false)
    }
  }, [fetchStatus, isPreviewMode, user?.id])

  // Auto-open modal for users who need onboarding
  useEffect(() => {
    if (loading) return

    const bypassEnabled = resolveBypassEnabled()

    if (isPreviewMode || bypassEnabled) {
      setIsModalOpen(true)
      return
    }

    // Only auto-open when we have a confirmed server response.
    // If state is null the API call failed — don't show the modal
    // because we don't know if the user actually needs onboarding.
    if (!state) return

    if (needsOnboarding(state) && state.current_phase !== 'completed') {
      setIsModalOpen(true)
      if (state.current_phase === 'welcome') {
        Analytics.track('onboarding_started', {
          timestamp: new Date().toISOString()
        })
        Analytics.setUserProperties({ onboarding_started_at: new Date().toISOString() })
      }
    }
  }, [isPreviewMode, loading, resolveBypassEnabled, state])

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const refresh = useCallback(async () => {
    if (user?.id) {
      if (isPreviewMode) {
        setState(readLocalState(user.id))
        return
      }
      clearOnboardingCache(user.id)
      await fetchStatus()
    }
  }, [fetchStatus, isPreviewMode, readLocalState, user?.id])

  const setWizardData = useCallback((data: Partial<WizardData>) => {
    setWizardDataState(prev => ({ ...prev, ...data }))
  }, [])

  const nextPhase = useCallback(async () => {
    if (!user?.id || !state) return

    const currentPhase = state.current_phase
    const next = getNextPhase(currentPhase)
    if (!next) return

    if (isPreviewMode) {
      applyLocalUpdate({
        current_phase: next,
        current_step: 0
      })
      return
    }

    try {
      setLoading(true)
      const updated = await updateOnboarding(user.id, {
        current_phase: next,
        current_step: 0
      })
      setState(updated)

      // Log phase transition to DB
      await logOnboardingEvent(user.id, 'phase_started', {
        phase: next,
        metadata: { previous_phase: currentPhase }
      })

      // Also track to Amplitude
      Analytics.track('onboarding_step_completed', {
        phase: currentPhase,
        timestamp: new Date().toISOString()
      })
      Analytics.track('onboarding_step_started', {
        phase: next,
        previous_phase: currentPhase,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error advancing phase:', err)
      setError('Failed to advance to next step')
    } finally {
      setLoading(false)
    }
  }, [applyLocalUpdate, isPreviewMode, state, user?.id])

  const prevPhase = useCallback(async () => {
    if (!user?.id || !state) return

    const prev = getPreviousPhase(state.current_phase)
    if (!prev) return

    if (isPreviewMode) {
      applyLocalUpdate({
        current_phase: prev,
        current_step: 0
      })
      return
    }

    try {
      setLoading(true)
      const updated = await updateOnboarding(user.id, {
        current_phase: prev,
        current_step: 0
      })
      setState(updated)
    } catch (err) {
      console.error('Error going back:', err)
      setError('Failed to go back')
    } finally {
      setLoading(false)
    }
  }, [applyLocalUpdate, isPreviewMode, state, user?.id])

  const goToPhase = useCallback(async (phase: OnboardingPhase) => {
    if (!user?.id) return

    if (isPreviewMode) {
      applyLocalUpdate({
        current_phase: phase,
        current_step: 0
      })
      return
    }

    try {
      setLoading(true)
      const updated = await updateOnboarding(user.id, {
        current_phase: phase,
        current_step: 0
      })
      setState(updated)

      // Log phase transition
      await logOnboardingEvent(user.id, 'phase_started', {
        phase,
        metadata: { previous_phase: state?.current_phase }
      })
    } catch (err) {
      console.error('Error changing phase:', err)
      setError('Failed to change step')
    } finally {
      setLoading(false)
    }
  }, [applyLocalUpdate, isPreviewMode, state, user?.id])

  const skip = useCallback(async (reason?: string) => {
    if (!user?.id) return

    if (isPreviewMode) {
      applyLocalUpdate({
        is_skipped: true,
        skipped_at: new Date().toISOString()
      })
      return
    }

    try {
      setLoading(true)
      const result = await skipOnboarding(user.id, reason)
      setState(result.onboarding)

      // Track skip to Amplitude
      Analytics.track('onboarding_skipped', {
        phase: state?.current_phase,
        reason,
        timestamp: new Date().toISOString()
      })
      Analytics.setUserProperties({
        onboarding_skipped: true,
        onboarding_skipped_at: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error skipping onboarding:', err)
      setError('Failed to skip onboarding')
      throw err
    } finally {
      setLoading(false)
    }
  }, [applyLocalUpdate, isPreviewMode, state, user?.id])

  const complete = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated')

    if (isPreviewMode) {
      applyLocalUpdate({
        current_phase: 'completed',
        is_completed: true,
        completed_at: new Date().toISOString(),
        is_skipped: false,
        skipped_at: null
      })
      return {
        accountsCreated: 0,
        categoriesCount: 0,
        budgetsCreated: 0,
        durationSeconds: 0
      }
    }

    try {
      setLoading(true)
      const result = await completeOnboarding(user.id, { wizardData })
      setState(result.onboarding)

      // Track completion to Amplitude
      Analytics.track('onboarding_completed', {
        accounts_created: result.summary.accountsCreated,
        categories_count: result.summary.categoriesCount,
        budgets_created: result.summary.budgetsCreated,
        duration_seconds: result.summary.durationSeconds,
        timestamp: new Date().toISOString()
      })
      Analytics.setUserProperties({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      })

      return result.summary
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('Failed to complete onboarding')
      throw err
    } finally {
      setLoading(false)
    }
  }, [applyLocalUpdate, isPreviewMode, user?.id, wizardData])

  const logEvent = useCallback(async (
    eventType: 'phase_started' | 'phase_completed' | 'step_completed',
    metadata?: Record<string, unknown>
  ) => {
    if (!user?.id || !state) return

    if (isPreviewMode) return

    // Map internal event types to standardised Amplitude event names
    const amplitudeEventMap: Record<string, string> = {
      phase_started: 'onboarding_step_started',
      phase_completed: 'onboarding_step_completed',
      step_completed: 'onboarding_step_completed',
    }
    const amplitudeEvent = amplitudeEventMap[eventType] ?? `onboarding_${eventType}`

    try {
      // Log to database
      await logOnboardingEvent(user.id, eventType, {
        phase: state.current_phase,
        step: state.current_step,
        metadata
      })

      // Also track to Amplitude with standardised name
      Analytics.track(amplitudeEvent, {
        phase: state.current_phase,
        step: state.current_step,
        ...metadata,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      // Don't throw - event logging shouldn't block the UI
      console.error('Error logging onboarding event:', err)
    }
  }, [isPreviewMode, state, user?.id])

  // Calculate progress percentage
  const progress = state
    ? Math.round((ONBOARDING_PHASES.indexOf(state.current_phase) / (ONBOARDING_PHASES.length - 1)) * 100)
    : 0

  return (
    <OnboardingContext.Provider
      value={{
        state,
        loading,
        error,
        needsOnboarding: isPreviewMode ? true : (resolveBypassEnabled() ? true : needsOnboarding(state)),
        currentPhase: state?.current_phase ?? null,
        progress,
        isPreviewMode,
        isModalOpen,
        openModal,
        closeModal,
        wizardData,
        setWizardData,
        refresh,
        nextPhase,
        prevPhase,
        goToPhase,
        skip,
        complete,
        logEvent
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
