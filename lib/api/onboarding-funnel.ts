// Typed client wrappers for the onboarding funnel write endpoints.
// Exports:
//   - `advanceOnboarding`   → POST /api/onboarding/advance  (phase progression + event logging)
//   - `finalizeOnboarding`  → POST /api/onboarding/finalize (persist guest draft on conversion)
//
// Guest financial data (goal + plan) is never written during the anonymous
// funnel; it is collected client-side in the onboarding draft store and
// persisted in a single atomic call to `finalizeOnboarding` at conversion time.

import type { OnboardingDraft } from '@/lib/onboarding/build-draft'

/** Goal-type values shared by the draft store and the finalize RPC. */
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

/** Funnel-facing phases accepted by POST /api/onboarding/advance (subset of current_phase). */
export type AdvancePhase = 'intent' | 'goal_setup' | 'health_check' | 'plan' | 'conversion' | 'completed'

export const advanceOnboarding = (phase: AdvancePhase, event?: { event_type: string; metadata?: Record<string, unknown> }) =>
  postJson<{ onboarding: { current_phase: string } }>('/api/onboarding/advance', { phase, event })

export const finalizeOnboarding = (draft: OnboardingDraft) =>
  postJson<{ goal_id: string | null; plan_id: string | null; account_id: string }>(
    '/api/onboarding/finalize',
    draft,
  )
