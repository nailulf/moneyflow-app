// Typed client wrappers for the onboarding funnel write endpoints
// (`/api/onboarding/goal` and `/api/onboarding/plan`). Thin typed `fetch`
// helpers used by the Phase 2 funnel UI to persist the guest's goal and plan.
//
// Input types mirror the Zod schemas in the route files exactly:
//   - goal_type union  → app/api/onboarding/goal/route.ts (GOAL_TYPES)
//   - period union     → app/api/onboarding/plan/route.ts (PlanSchema.period)

import type { OnboardingDraft } from '@/lib/onboarding/build-draft'

/** Mirrors the `goal_type` enum in app/api/onboarding/goal/route.ts (GOAL_TYPES). */
export type OnboardingGoalType =
  | 'emergency_fund'
  | 'vacation'
  | 'house_down_payment'
  | 'car_purchase'
  | 'education'
  | 'wedding'
  | 'investment'
  | 'other'
  | 'debt_payoff'
  | 'gadget'

export type OnboardingGoalInput = {
  goal_type: OnboardingGoalType
  target_amount: number
  /** ISO date (YYYY-MM-DD). Defaults server-side to one year out when omitted. */
  target_date?: string
  /** Defaults server-side from the goal type when omitted. */
  name?: string
}

/** Mirrors the `period` enum in app/api/onboarding/plan/route.ts (no 'weekly'). */
export type OnboardingPlanPeriod = 'monthly' | 'yearly'

export type OnboardingPlanInput = {
  // Accepted by the endpoint for the funnel's use, but not persisted (the
  // route stores the allocation sum as the budget ceiling).
  monthly_income: number
  /** Defaults server-side to 'monthly' when omitted. */
  period?: OnboardingPlanPeriod
  allocations: { category_id: string; amount: number }[]
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload?.error ?? `${url} failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const saveOnboardingGoal = (input: OnboardingGoalInput) =>
  postJson<{ goal: { id: string; account_id: string } }>('/api/onboarding/goal', input)

export const saveOnboardingPlan = (input: OnboardingPlanInput) =>
  postJson<{ plan: { id: string } }>('/api/onboarding/plan', input)

/** Funnel-facing phases accepted by POST /api/onboarding/advance (subset of current_phase). */
export type AdvancePhase = 'intent' | 'goal_setup' | 'health_check' | 'plan' | 'conversion' | 'completed'

export const advanceOnboarding = (phase: AdvancePhase, event?: { event_type: string; metadata?: Record<string, unknown> }) =>
  postJson<{ onboarding: { current_phase: string } }>('/api/onboarding/advance', { phase, event })

export const finalizeOnboarding = (draft: OnboardingDraft) =>
  postJson<{ goal_id: string | null; plan_id: string | null; account_id: string }>(
    '/api/onboarding/finalize',
    draft,
  )
