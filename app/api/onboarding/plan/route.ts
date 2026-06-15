import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'

// `period` mirrors the DB CHECK on budget_plans.period
// (supabase/migrations/027_create_budget_plan_tables.sql): only 'monthly'
// and 'yearly' are allowed — there is no 'weekly' plan in this model.
const PlanSchema = z.object({
  // `monthly_income` is accepted for the onboarding funnel's use but is NOT
  // persisted: budget_plans has no income column, and adding one is out of
  // scope for Phase 1 (would require a dedicated future migration).
  // budget_plans.total_amount is the budget *ceiling* = SUM of category
  // allocations (see app/budget/{create,edit}/page.tsx and
  // lib/budget-screen-utils.ts), so it is computed from `allocations` below.
  monthly_income: z.number().min(0).max(1e15),
  period: z.enum(['monthly', 'yearly']).default('monthly'),
  allocations: z
    .array(
      z.object({
        // z.guid() (not z.string().uuid()): Zod v4's strict .uuid() rejects
        // UUIDs whose version/variant nibbles aren't RFC-9562-compliant.
        // Real category ids from Postgres are valid either way; guid() also
        // accepts the synthetic fixtures used in tests.
        category_id: z.guid(),
        amount: z.number().min(0).max(1e15),
      })
    )
    .max(100),
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

  const parsed = PlanSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 422 })
  }

  // Service-role client bypasses the deny-anonymous-write RLS (Task 3); the
  // write stays scoped to the authenticated caller's own user_id.
  const admin = createServerComponentClient()

  // total_amount is the budget ceiling = SUM of the category allocations.
  const total = parsed.data.allocations.reduce((s, a) => s + a.amount, 0)

  // Upsert on the UNIQUE(user_id, period) constraint
  // (budget_plans_user_period_unique).
  const { data: plan, error: planErr } = await admin
    .from('budget_plans')
    .upsert(
      {
        user_id: user.id,
        period: parsed.data.period,
        total_amount: total,
      },
      { onConflict: 'user_id,period' }
    )
    .select()
    .single()
  if (planErr || !plan) {
    return NextResponse.json({ error: planErr?.message ?? 'plan failed' }, { status: 500 })
  }

  // Replace the plan's allocations. budget_plan_categories FK column is
  // `plan_id`; allocation column is `allocated_amount`.
  await admin.from('budget_plan_categories').delete().eq('plan_id', plan.id)
  if (parsed.data.allocations.length) {
    const { error: catErr } = await admin.from('budget_plan_categories').insert(
      parsed.data.allocations.map((a) => ({
        plan_id: plan.id,
        category_id: a.category_id,
        allocated_amount: a.amount,
      }))
    )
    if (catErr) {
      return NextResponse.json({ error: catErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ plan })
}
