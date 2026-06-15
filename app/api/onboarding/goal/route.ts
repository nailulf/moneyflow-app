import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'

// goal_type values mirror the DB CHECK constraint in
// supabase/migrations/026_create_financial_goals_table.sql.
const GOAL_TYPES = [
  'emergency_fund',
  'vacation',
  'house_down_payment',
  'car_purchase',
  'education',
  'wedding',
  'investment',
  'other',
  'debt_payoff',
  'gadget',
] as const

// Human-readable fallback names, used when the caller omits `name`
// (the DB column is NOT NULL).
const GOAL_TYPE_LABELS: Record<(typeof GOAL_TYPES)[number], string> = {
  emergency_fund: 'Emergency Fund',
  vacation: 'Vacation',
  house_down_payment: 'House Down Payment',
  car_purchase: 'Car Purchase',
  education: 'Education',
  wedding: 'Wedding',
  investment: 'Investment',
  other: 'Savings Goal',
  debt_payoff: 'Pay Off Debt',
  gadget: 'New Gadget',
}

const GoalSchema = z.object({
  goal_type: z.enum(GOAL_TYPES),
  target_amount: z.number().positive().max(1e15),
  target_date: z.string().date().optional(),
  name: z.string().max(120).optional(),
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

  const parsed = GoalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 422 })
  }

  // Service-role client bypasses the deny-anonymous-write RLS (Task 3); the
  // write is still scoped to the authenticated caller's own default account.
  const admin = createServerComponentClient()

  const { data: account, error: accErr } = await admin
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()
  if (accErr || !account) {
    return NextResponse.json({ error: 'No default account' }, { status: 409 })
  }

  // `name` and `target_date` are NOT NULL in the DB. Default `name` from the
  // goal type, and `target_date` to one year out, when the caller omits them.
  const name = parsed.data.name ?? GOAL_TYPE_LABELS[parsed.data.goal_type]
  const targetDate =
    parsed.data.target_date ??
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: goal, error: goalErr } = await admin
    .from('financial_goals')
    .upsert(
      {
        account_id: account.id,
        goal_type: parsed.data.goal_type,
        target_amount: parsed.data.target_amount,
        target_date: targetDate,
        name,
        status: 'active',
      },
      { onConflict: 'account_id' }
    )
    .select()
    .single()
  if (goalErr) {
    return NextResponse.json({ error: goalErr.message }, { status: 500 })
  }

  return NextResponse.json({ goal })
}
