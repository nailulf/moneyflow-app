import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { isDevToolsEnabled } from '@/lib/utils/environment'

export async function POST(request: NextRequest) {
  if (!isDevToolsEnabled()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and preview environments' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { userId, email } = body as { userId?: string; email?: string }

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 })
    }

    const supabase = createServerComponentClient()
    let resolvedUserId = userId

    if (!resolvedUserId && email) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
      if (usersError || !usersData?.users) {
        return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
      }
      const user = usersData.users.find((candidate) => candidate.email === email)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      resolvedUserId = user.id
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', resolvedUserId)
    const budgetIds = (budgetRows ?? []).map((row) => row.id)

    if (budgetIds.length > 0) {
      await supabase.from('budget_categories').delete().in('budget_id', budgetIds)
    }

    const { data: snapshotRows } = await supabase
      .from('budget_snapshots')
      .select('id')
      .eq('user_id', resolvedUserId)
    const snapshotIds = (snapshotRows ?? []).map((row) => row.id)

    if (snapshotIds.length > 0) {
      await supabase.from('budget_snapshot_categories').delete().in('snapshot_id', snapshotIds)
    }

    const { data: planRows } = await supabase
      .from('budget_plans')
      .select('id')
      .eq('user_id', resolvedUserId)
    const planIds = (planRows ?? []).map((row) => row.id)

    if (planIds.length > 0) {
      await supabase.from('budget_plan_categories').delete().in('plan_id', planIds)
    }

    await supabase.from('transactions').delete().eq('user_id', resolvedUserId)
    await supabase.from('budget_snapshots').delete().eq('user_id', resolvedUserId)
    await supabase.from('budget_plans').delete().eq('user_id', resolvedUserId)
    await supabase.from('budgets').delete().eq('user_id', resolvedUserId)

    const { data: accountRows } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', resolvedUserId)
    const accountIds = (accountRows ?? []).map((row) => row.id)

    if (accountIds.length > 0) {
      await supabase.from('financial_goals').delete().in('account_id', accountIds)
    }

    await supabase.from('statements').delete().eq('user_id', resolvedUserId)
    await supabase.from('uploaded_files').delete().eq('user_id', resolvedUserId)
    await supabase.from('accounts').delete().eq('user_id', resolvedUserId)
    await supabase.from('user_preferences').delete().eq('user_id', resolvedUserId)
    await supabase.from('onboarding_events').delete().eq('user_id', resolvedUserId)
    await supabase.from('categories').delete().eq('user_id', resolvedUserId).eq('is_custom', true)
    await supabase.from('category_groups').delete().eq('user_id', resolvedUserId).eq('is_default', false)

    const { data: onboardingData, error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: resolvedUserId,
        current_phase: 'welcome',
        current_step: 0,
        is_completed: false,
        is_skipped: false,
        completed_at: null,
        skipped_at: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (onboardingError) {
      return NextResponse.json({ error: 'Failed to reset onboarding state' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId: resolvedUserId,
      onboarding: onboardingData
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
