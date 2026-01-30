import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import type { OnboardingPhase } from '@/types/database';

export function useOnboardingTracking() {
  const { trackEvent, trackUserProperty } = useAnalytics();

  const trackOnboardingStarted = useCallback(() => {
    trackEvent('onboarding_started', {
      timestamp: new Date().toISOString()
    });
    trackUserProperty('onboarding_started_at', new Date().toISOString());
  }, [trackEvent, trackUserProperty]);

  const trackOnboardingPhaseStarted = useCallback((
    phase: OnboardingPhase,
    step?: number
  ) => {
    trackEvent('onboarding_phase_started', {
      phase,
      step: step ?? 0,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackOnboardingPhaseCompleted = useCallback((
    phase: OnboardingPhase,
    metadata?: Record<string, unknown>
  ) => {
    trackEvent('onboarding_phase_completed', {
      phase,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackOnboardingStepCompleted = useCallback((
    phase: OnboardingPhase,
    step: number,
    stepName?: string
  ) => {
    trackEvent('onboarding_step_completed', {
      phase,
      step,
      step_name: stepName,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackOnboardingSkipped = useCallback((
    phase: OnboardingPhase,
    reason?: string
  ) => {
    trackEvent('onboarding_skipped', {
      phase,
      reason,
      timestamp: new Date().toISOString()
    });
    trackUserProperty('onboarding_skipped', true);
    trackUserProperty('onboarding_skipped_at', new Date().toISOString());
  }, [trackEvent, trackUserProperty]);

  const trackOnboardingCompleted = useCallback((
    summary: {
      accountsCreated?: number;
      categoriesCount?: number;
      budgetsCreated?: number;
      durationSeconds?: number;
    }
  ) => {
    trackEvent('onboarding_completed', {
      accounts_created: summary.accountsCreated ?? 0,
      categories_count: summary.categoriesCount ?? 0,
      budgets_created: summary.budgetsCreated ?? 0,
      duration_seconds: summary.durationSeconds ?? 0,
      timestamp: new Date().toISOString()
    });
    trackUserProperty('onboarding_completed', true);
    trackUserProperty('onboarding_completed_at', new Date().toISOString());
  }, [trackEvent, trackUserProperty]);

  const trackOnboardingResumed = useCallback((
    phase: OnboardingPhase,
    step: number
  ) => {
    trackEvent('onboarding_resumed', {
      phase,
      step,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackOnboardingStarted,
    trackOnboardingPhaseStarted,
    trackOnboardingPhaseCompleted,
    trackOnboardingStepCompleted,
    trackOnboardingSkipped,
    trackOnboardingCompleted,
    trackOnboardingResumed
  };
}
