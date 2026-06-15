import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'

// Phases the guest funnel advances through. Subset of the full current_phase
// CHECK constraint (supabase/migrations/052_extend_onboarding_phases.sql) —
// only the funnel-facing values, not the legacy welcome/account_setup/etc.
const ADVANCE_PHASES = [
  'intent',
  'goal_setup',
  'health_check',
  'plan',
  'conversion',
  'completed',
] as const

// event_type mirrors the DB CHECK on onboarding_events.event_type
// (supabase/migrations/024_create_onboarding_tables.sql) — never extended
// since, so these six are the only values the insert will accept.
const EVENT_TYPES = [
  'phase_started',
  'phase_completed',
  'step_completed',
  'skipped',
  'resumed',
  'completed',
] as const

const AdvanceSchema = z.object({
  phase: z.enum(ADVANCE_PHASES),
  event: z
    .object({
      event_type: z.enum(EVENT_TYPES),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = AdvanceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 422 })
  }

  const { phase, event } = parsed.data

  // Service-role client bypasses the deny-anonymous-write RLS (migration 053);
  // every write below stays scoped to the authenticated caller's own user_id.
  const admin = createServerComponentClient()

  // Reaching 'completed' also flips the terminal flags.
  const update: {
    current_phase: (typeof ADVANCE_PHASES)[number]
    is_completed?: boolean
    completed_at?: string
  } = { current_phase: phase }
  if (phase === 'completed') {
    update.is_completed = true
    update.completed_at = new Date().toISOString()
  }

  const { data: onboarding, error: updateErr } = await admin
    .from('user_onboarding')
    .update(update)
    .eq('user_id', user.id)
    .select()
    .single()
  if (updateErr || !onboarding) {
    return NextResponse.json({ error: updateErr?.message ?? 'advance failed' }, { status: 500 })
  }

  if (event) {
    const { error: eventErr } = await admin.from('onboarding_events').insert({
      user_id: user.id,
      event_type: event.event_type,
      phase,
      metadata: event.metadata ?? {},
    })
    if (eventErr) {
      return NextResponse.json({ error: eventErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ onboarding })
}
