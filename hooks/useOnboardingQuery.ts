'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UserOnboardingDB,
  UserOnboardingUpdate,
  BudgetTemplateDB,
  OnboardingPhase,
  OnboardingEventType
} from '@/types/database'
import {
  getOnboardingStatus,
  updateOnboarding,
  skipOnboarding,
  completeOnboarding,
  logOnboardingEvent,
  getBudgetTemplates
} from '@/lib/api/onboarding'
import { toast } from 'sonner'

/**
 * Query key factory for onboarding
 */
export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: (userId: string) => [...onboardingKeys.all, 'status', userId] as const,
  events: (userId: string) => [...onboardingKeys.all, 'events', userId] as const,
  templates: () => [...onboardingKeys.all, 'templates'] as const,
}

interface UseOnboardingStatusOptions {
  userId: string
  enabled?: boolean
}

/**
 * Hook to fetch onboarding status
 */
export function useOnboardingStatus(options: UseOnboardingStatusOptions) {
  const { userId, enabled = true } = options

  return useQuery({
    queryKey: onboardingKeys.status(userId),
    queryFn: () => getOnboardingStatus(userId),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to update onboarding state
 */
export function useUpdateOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      updates
    }: {
      userId: string
      updates: UserOnboardingUpdate
    }) => {
      return updateOnboarding(userId, updates)
    },
    onSuccess: (data, { userId }) => {
      // Update cache immediately
      queryClient.setQueryData(onboardingKeys.status(userId), data)
    },
    onError: (error) => {
      console.error('Error updating onboarding:', error)
      toast.error('Failed to update onboarding progress')
    },
  })
}

/**
 * Hook to advance to next phase
 */
export function useAdvancePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      nextPhase
    }: {
      userId: string
      nextPhase: OnboardingPhase
    }) => {
      const result = await updateOnboarding(userId, {
        current_phase: nextPhase,
        current_step: 0
      })

      // Log the phase transition
      await logOnboardingEvent(userId, 'phase_started', {
        phase: nextPhase
      })

      return result
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(onboardingKeys.status(userId), data)
    },
    onError: (error) => {
      console.error('Error advancing phase:', error)
      toast.error('Failed to advance to next step')
    },
  })
}

/**
 * Hook to skip onboarding
 */
export function useSkipOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      reason
    }: {
      userId: string
      reason?: string
    }) => {
      return skipOnboarding(userId, reason)
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(onboardingKeys.status(userId), data.onboarding)
      toast.success('You can complete setup later from your dashboard')
    },
    onError: (error) => {
      console.error('Error skipping onboarding:', error)
      toast.error('Failed to skip onboarding')
    },
  })
}

/**
 * Hook to complete onboarding
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      summary
    }: {
      userId: string
      summary?: Record<string, unknown>
    }) => {
      return completeOnboarding(userId, summary)
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(onboardingKeys.status(userId), data.onboarding)
    },
    onError: (error) => {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding')
    },
  })
}

/**
 * Hook to log onboarding events
 */
export function useLogOnboardingEvent() {
  return useMutation({
    mutationFn: async ({
      userId,
      eventType,
      phase,
      step,
      metadata
    }: {
      userId: string
      eventType: OnboardingEventType
      phase?: string
      step?: number
      metadata?: Record<string, unknown>
    }) => {
      return logOnboardingEvent(userId, eventType, { phase, step, metadata })
    },
    // Don't show errors for event logging - it shouldn't block the user
    onError: (error) => {
      console.error('Error logging onboarding event:', error)
    },
  })
}

/**
 * Hook to fetch budget templates
 */
export function useBudgetTemplates() {
  return useQuery({
    queryKey: onboardingKeys.templates(),
    queryFn: getBudgetTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates rarely change
  })
}

/**
 * Combined hook for onboarding with all mutations
 */
export function useOnboardingActions(userId: string) {
  const updateMutation = useUpdateOnboarding()
  const advanceMutation = useAdvancePhase()
  const skipMutation = useSkipOnboarding()
  const completeMutation = useCompleteOnboarding()
  const logEventMutation = useLogOnboardingEvent()

  return {
    update: (updates: UserOnboardingUpdate) =>
      updateMutation.mutateAsync({ userId, updates }),
    advance: (nextPhase: OnboardingPhase) =>
      advanceMutation.mutateAsync({ userId, nextPhase }),
    skip: (reason?: string) =>
      skipMutation.mutateAsync({ userId, reason }),
    complete: (summary?: Record<string, unknown>) =>
      completeMutation.mutateAsync({ userId, summary }),
    logEvent: (
      eventType: OnboardingEventType,
      options?: { phase?: string; step?: number; metadata?: Record<string, unknown> }
    ) =>
      logEventMutation.mutate({
        userId,
        eventType,
        ...options
      }),
    isUpdating:
      updateMutation.isPending ||
      advanceMutation.isPending ||
      skipMutation.isPending ||
      completeMutation.isPending,
  }
}
