import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'
import { planMerge } from '@/lib/onboarding/merge'

// Parse the body defensively — the caller (lib/onboarding/convert.ts) may POST
// without a Content-Type header, so don't rely on request.json() inferring it.
const Body = z.object({ anonAccessToken: z.string().min(10) })

/**
 * Dual-token-verified bounded merge.
 *
 * Runs when a guest tries to convert with an email that already belongs to an
 * existing account: the client signs into that existing account (target B) and
 * POSTs the captured anonymous access token (user A) here. This is the ONLY path
 * that touches two users, so the dual-token check is the security boundary:
 *  - B is proven by the cookie session.
 *  - A is proven by the anon access token (validated via the service-role admin).
 *  - A must be anonymous AND distinct from B, else 403 — this stops B from
 *    claiming an arbitrary anonymous user's data.
 *
 * After a successful bounded import, the orphaned anonymous user A is deleted.
 */
export async function POST(request: Request) {
  // 1. Target user B — from the cookie session.
  const supabase = await createClient()
  const {
    data: { user: target },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !target) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Body — anon access token.
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // 3. Anonymous user A — validated by the service-role admin client.
  const admin = createServerComponentClient()
  const { data: anonRes, error: anonErr } = await admin.auth.getUser(parsed.data.anonAccessToken)
  if (anonErr || !anonRes?.user) {
    return NextResponse.json({ error: 'Invalid anon token' }, { status: 400 })
  }
  const anon = anonRes.user

  // 4. Dual-token gate: A must be anonymous AND a different user than B.
  if (!(anon as { is_anonymous?: boolean }).is_anonymous || anon.id === target.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // --- 5. Gather (service-role bypasses RLS) ---
  // financial_goals ownership is via account_id -> accounts.user_id (no direct
  // user_id column), so join through accounts.
  const [gGoal, gPlan, gCats, bAcc] = await Promise.all([
    admin
      .from('financial_goals')
      .select('*, accounts!inner(user_id)')
      .eq('accounts.user_id', anon.id)
      .maybeSingle(),
    admin.from('budget_plans').select('*').eq('user_id', anon.id).maybeSingle(),
    admin.from('categories').select('id,name,group_type').eq('user_id', anon.id),
    admin.from('accounts').select('id').eq('user_id', target.id).eq('is_default', true).single(),
  ])

  if (!bAcc.data) {
    return NextResponse.json({ error: 'No default account for target' }, { status: 409 })
  }

  const gPlanCats = gPlan.data
    ? await admin
        .from('budget_plan_categories')
        .select('allocated_amount, categories(name, group_type)')
        .eq('plan_id', gPlan.data.id)
    : { data: [] as { allocated_amount: number; categories: { name: string; group_type: string } }[] }

  const [bGoals, bPlans, bCats] = await Promise.all([
    admin
      .from('financial_goals')
      .select('account_id, accounts!inner(user_id)')
      .eq('accounts.user_id', target.id),
    admin.from('budget_plans').select('period').eq('user_id', target.id),
    admin.from('categories').select('id,name,group_type').eq('user_id', target.id),
  ])

  // Map the real `period` column INTO planMerge's own `period_type` field name.
  // budget_plans has no income column; planMerge's monthly_income is unused on
  // import here (we derive total_amount from the allocations), so feed 0.
  const plan = planMerge(
    {
      goal: gGoal.data
        ? {
            goal_type: gGoal.data.goal_type,
            target_amount: gGoal.data.target_amount,
            target_date: gGoal.data.target_date,
          }
        : null,
      plan: gPlan.data
        ? {
            period_type: gPlan.data.period,
            monthly_income: 0,
            allocations: (gPlanCats.data ?? []).map((r) => ({
              categoryName: (r as { categories: { name: string } }).categories.name,
              group_type: (r as { categories: { group_type: string } }).categories.group_type,
              amount: (r as { allocated_amount: number }).allocated_amount,
            })),
          }
        : null,
      categories: (gCats.data ?? []) as { id: string; name: string; group_type: string }[],
    },
    {
      defaultAccountId: bAcc.data.id,
      existingGoalAccountIds: (bGoals.data ?? []).map((g: { account_id: string }) => g.account_id),
      existingPlanPeriods: (bPlans.data ?? []).map((p: { period: string }) => p.period),
      categories: (bCats.data ?? []) as { id: string; name: string; group_type: string }[],
    }
  )

  // --- 6. Execute the import (service-role) ---
  // This merge is destructive: it ends by deleting A. So EVERY write that the
  // planner decided to run for an 'import' action must be checked, and ANY error
  // aborts BEFORE deleteUser — leaving A and its source data intact for a retry.
  // Writes the planner marked 'discard' are simply skipped (not run, not errors).
  if (plan.goal.action === 'import' && gGoal.data) {
    // name + target_date are NOT NULL in financial_goals (migration 026); carry
    // them over from A's goal.
    const { error: goalErr } = await admin.from('financial_goals').insert({
      account_id: plan.goal.account_id,
      name: gGoal.data.name,
      goal_type: gGoal.data.goal_type,
      target_amount: gGoal.data.target_amount,
      target_date: gGoal.data.target_date,
      status: 'active',
    })
    if (goalErr) {
      return NextResponse.json({ error: 'Merge failed', detail: goalErr.message }, { status: 500 })
    }
  }

  if (plan.plan.action === 'import') {
    const totalAmount = plan.plan.allocations.reduce((sum, a) => sum + a.amount, 0)
    const { data: np, error: planErr } = await admin
      .from('budget_plans')
      .insert({
        user_id: target.id,
        period: plan.plan.period_type,
        total_amount: totalAmount,
      })
      .select()
      .single()
    if (planErr || !np) {
      return NextResponse.json(
        { error: 'Merge failed', detail: planErr?.message ?? 'plan insert returned no row' },
        { status: 500 }
      )
    }
    if (plan.plan.allocations.length) {
      const { error: catErr } = await admin.from('budget_plan_categories').insert(
        plan.plan.allocations.map((a) => ({
          plan_id: np.id,
          category_id: a.category_id,
          allocated_amount: a.amount,
        }))
      )
      if (catErr) {
        return NextResponse.json(
          { error: 'Merge failed', detail: catErr.message },
          { status: 500 }
        )
      }
    }
  }

  // --- 7. Reap the orphaned anonymous user (FK cascade clears its seeded rows) ---
  // Reached only after ALL required import writes succeeded.
  await admin.auth.admin.deleteUser(anon.id)

  return NextResponse.json({ merged: true, plan })
}
