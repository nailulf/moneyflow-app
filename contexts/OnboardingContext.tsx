'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
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
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, setState] = useState<UserOnboardingDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardData, setWizardDataState] = useState<WizardData>({})

  // Fetch onboarding status when user changes
  useEffect(() => {
    if (user?.id) {
      fetchStatus()
    } else {
      setState(null)
      setLoading(false)
    }
  }, [user?.id])

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      const data = await getOnboardingStatus(user.id)
      setState(data)
    } catch (err) {
      console.error('Error fetching onboarding status:', err)
      setError('Failed to fetch onboarding status')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const refresh = useCallback(async () => {
    if (user?.id) {
      clearOnboardingCache(user.id)
      await fetchStatus()
    }
  }, [user?.id, fetchStatus])

  const setWizardData = useCallback((data: Partial<WizardData>) => {
    setWizardDataState(prev => ({ ...prev, ...data }))
  }, [])

  const nextPhase = useCallback(async () => {
    if (!user?.id || !state) return

    const next = getNextPhase(state.current_phase)
    if (!next) return

    try {
      setLoading(true)
      const updated = await updateOnboarding(user.id, {
        current_phase: next,
        current_step: 0
      })
      setState(updated)

      // Log phase transition
      await logOnboardingEvent(user.id, 'phase_started', {
        phase: next,
        metadata: { previous_phase: state.current_phase }
      })
    } catch (err) {
      console.error('Error advancing phase:', err)
      setError('Failed to advance to next step')
    } finally {
      setLoading(false)
    }
  }, [user?.id, state])

  const prevPhase = useCallback(async () => {
    if (!user?.id || !state) return

    const prev = getPreviousPhase(state.current_phase)
    if (!prev) return

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
  }, [user?.id, state])

  const goToPhase = useCallback(async (phase: OnboardingPhase) => {
    if (!user?.id) return

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
  }, [user?.id, state])

  const skip = useCallback(async (reason?: string) => {
    if (!user?.id) return

    try {
      setLoading(true)
      const result = await skipOnboarding(user.id, reason)
      setState(result.onboarding)
    } catch (err) {
      console.error('Error skipping onboarding:', err)
      setError('Failed to skip onboarding')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const complete = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      setLoading(true)
      const result = await completeOnboarding(user.id, { wizardData })
      setState(result.onboarding)
      return result.summary
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError('Failed to complete onboarding')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user?.id, wizardData])

  const logEvent = useCallback(async (
    eventType: 'phase_started' | 'phase_completed' | 'step_completed',
    metadata?: Record<string, unknown>
  ) => {
    if (!user?.id || !state) return

    try {
      await logOnboardingEvent(user.id, eventType, {
        phase: state.current_phase,
        step: state.current_step,
        metadata
      })
    } catch (err) {
      // Don't throw - event logging shouldn't block the UI
      console.error('Error logging onboarding event:', err)
    }
  }, [user?.id, state])

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
        needsOnboarding: needsOnboarding(state),
        currentPhase: state?.current_phase ?? null,
        progress,
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
