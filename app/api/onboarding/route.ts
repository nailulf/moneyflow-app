import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserOnboardingDB, UserOnboardingUpdate, OnboardingPhase } from '@/types/database'

const PHASE_ORDER: OnboardingPhase[] = [
  'welcome',
  'account_setup',
  'categories',
  'budget_setup',
  'completed',
]

// New guest-funnel phases are not part of the legacy linear PHASE_ORDER and
// must never be touched by the activity-based reconciliation below (which only
// understands the legacy welcome→…→completed flow).
const GUEST_FUNNEL_PHASES = new Set<OnboardingPhase>([
  'intent',
  'goal_setup',
  'health_check',
  'plan',
  'conversion',
])

/**
 * GET /api/onboarding
 * Fetches the onboarding state for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paramUserId = searchParams.get('userId')
    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching onboarding state:', error)
        return NextResponse.json({ error: 'Failed to fetch onboarding state' }, { status: 500 })
      }

      // No row found — user predates the onboarding feature.
      // Check their actual activity and create the correct row on-the-fly.
      // Note: intentionally no is_active filter — any record counts (matches migration 035).
      const [{ count: accountCount }, { count: budgetCount }] = await Promise.all([
        supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('budget_plans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const hasAccount = (accountCount ?? 0) > 0
      const hasBudget = (budgetCount ?? 0) > 0

      const seedPhase: OnboardingPhase =
        hasAccount && hasBudget ? 'completed'
        : hasAccount ? 'budget_setup'
        : 'welcome'

      const { data: created, error: createError } = await supabase
        .from('user_onboarding')
        .insert({
          user_id: userId,
          current_phase: seedPhase,
          current_step: 0,
          is_completed: seedPhase === 'completed',
          is_skipped: false,
          ...(seedPhase === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .select()
        .single()

      if (createError) {
        console.warn('[onboarding] failed to seed missing row:', createError.message)
        return NextResponse.json(null)
      }

      return NextResponse.json(created as UserOnboardingDB)
    }

    // Reconcile onboarding phase against actual user activity.
    // Users who completed the flow outside the wizard, or who existed before
    // the onboarding feature, may have stale phase/completion state.
    // Note: intentionally no is_active filter — any record counts (matches migration 035).
    // Anonymous (guest) users are driven solely by the funnel's explicit
    // advanceOnboarding() calls — they must never be auto-reconciled, regardless
    // of phase, so they can never be bumped onto the legacy welcome→…→completed
    // track by activity heuristics.
    if (
      data &&
      !data.is_completed &&
      !data.is_skipped &&
      !(user as { is_anonymous?: boolean }).is_anonymous &&
      !GUEST_FUNNEL_PHASES.has(data.current_phase as OnboardingPhase)
    ) {
      const [{ count: accountCount }, { count: budgetCount }] = await Promise.all([
        supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('budget_plans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const hasAccount = (accountCount ?? 0) > 0
      const hasBudget = (budgetCount ?? 0) > 0

      const currentPhaseIdx = PHASE_ORDER.indexOf(data.current_phase as OnboardingPhase)
      let targetPhase: OnboardingPhase = data.current_phase as OnboardingPhase
      let shouldComplete = false

      if (hasAccount && hasBudget) {
        shouldComplete = true
        targetPhase = 'completed'
      } else if (hasAccount) {
        // Advance past account_setup if the user is stuck before budget_setup
        const budgetPhaseIdx = PHASE_ORDER.indexOf('budget_setup')
        if (currentPhaseIdx < budgetPhaseIdx) {
          targetPhase = 'budget_setup'
        }
      }

      if (shouldComplete || targetPhase !== data.current_phase) {
        const reconcilePayload: Record<string, unknown> = {
          user_id: userId,
          current_phase: targetPhase,
          current_step: 0,
          updated_at: new Date().toISOString(),
        }
        if (shouldComplete) {
          reconcilePayload.is_completed = true
          reconcilePayload.completed_at = new Date().toISOString()
        }

        // Use upsert so the row is created if somehow missing, or updated if it exists.
        const { data: reconciled, error: reconcileError } = await supabase
          .from('user_onboarding')
          .upsert(reconcilePayload, { onConflict: 'user_id' })
          .select()
          .single()

        if (reconcileError) {
          // Non-fatal: log and return the stale state; will retry next time.
          console.warn('[onboarding] phase reconciliation failed:', reconcileError.message)
        } else if (reconciled) {
          return NextResponse.json(reconciled as UserOnboardingDB)
        }
      }
    }

    return NextResponse.json(data as UserOnboardingDB)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/onboarding
 * Updates the onboarding state for a user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId: bodyUserId, ...updates } = body as { userId?: string } & UserOnboardingUpdate

    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

    // Build update object, only including provided fields
    const updateData: UserOnboardingUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating onboarding state:', error)
      return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 })
    }

    return NextResponse.json(data as UserOnboardingDB)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/onboarding
 * Creates an onboarding record for a user (mainly for testing/admin purposes)
 * Normally this is created by the database trigger on user registration
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId: bodyUserId } = body
    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

    // Check if record already exists
    const { data: existing } = await supabase
      .from('user_onboarding')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Onboarding record already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .insert({
        user_id: userId,
        current_phase: 'welcome',
        current_step: 0,
        is_completed: false,
        is_skipped: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating onboarding record:', error)
      return NextResponse.json({ error: 'Failed to create onboarding record' }, { status: 500 })
    }

    return NextResponse.json(data as UserOnboardingDB, { status: 201 })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
