import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paramUserId = searchParams.get('userId')
    const period = searchParams.get('period')

    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('budget_plans')
      .select(`
        *,
        budget_plan_categories (
          id,
          category_id,
          allocated_amount,
          categories (
            id,
            name,
            color
          )
        )
      `)
      .eq('user_id', user.id)

    if (period) {
      query = query.eq('period', period)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching budget plans:', error)
      return NextResponse.json({ error: 'Failed to fetch budget plans' }, { status: 500 })
    }

    // If a specific period was requested, return the single plan or null
    if (period) {
      return NextResponse.json(data?.[0] || null)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { period, total_amount, currency, categories } = body

    if (!period || total_amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: period, total_amount' }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(period)) {
      return NextResponse.json({ error: 'period must be "monthly" or "yearly"' }, { status: 400 })
    }

    // Check if a plan already exists for this period
    const { data: existing } = await supabase
      .from('budget_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('period', period)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `A ${period} budget plan already exists. Use PUT to update it.` },
        { status: 409 }
      )
    }

    // Validate cross-plan category exclusivity
    if (categories && categories.length > 0) {
      const categoryIds = categories.map((c: { category_id: string }) => c.category_id)
      const oppositePeriod = period === 'monthly' ? 'yearly' : 'monthly'

      const { data: conflicting } = await supabase
        .from('budget_plan_categories')
        .select(`
          category_id,
          budget_plans!inner (period)
        `)
        .eq('budget_plans.user_id', user.id)
        .eq('budget_plans.period', oppositePeriod)
        .in('category_id', categoryIds)

      if (conflicting && conflicting.length > 0) {
        const conflictIds = conflicting.map((c: { category_id: string }) => c.category_id)
        return NextResponse.json(
          { error: `Categories already in ${oppositePeriod} plan: ${conflictIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // 1. Create the plan
    const { data: plan, error: planError } = await supabase
      .from('budget_plans')
      .insert({
        user_id: user.id,
        period,
        total_amount,
        currency: currency || 'IDR',
      })
      .select()
      .single()

    if (planError) {
      console.error('Error creating budget plan:', planError)
      return NextResponse.json({ error: 'Failed to create budget plan' }, { status: 500 })
    }

    // 2. Create plan categories — rollback plan if this fails
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const planCategoriesData = categories.map((cat: { category_id: string; allocated_amount: number }) => ({
        plan_id: plan.id,
        category_id: cat.category_id,
        allocated_amount: cat.allocated_amount,
      }))

      const { error: catError } = await supabase
        .from('budget_plan_categories')
        .insert(planCategoriesData)

      if (catError) {
        console.error('Error creating plan categories:', catError)
        await supabase.from('budget_plans').delete().eq('id', plan.id).eq('user_id', user.id)
        return NextResponse.json({ error: 'Failed to create plan categories' }, { status: 500 })
      }
    }

    // 3. Auto-create snapshot for current period (first-time setup)
    // Snapshot failure is non-fatal — it will be auto-created on next GET
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const snapshotData: {
      user_id: string
      period: string
      year: number
      month: number | null
      total_amount: number
      currency: string
      status: string
    } = {
      user_id: user.id,
      period,
      year: currentYear,
      month: period === 'monthly' ? currentMonth : null,
      total_amount,
      currency: currency || 'IDR',
      status: 'active',
    }

    const { data: snapshot } = await supabase
      .from('budget_snapshots')
      .insert(snapshotData)
      .select()
      .single()

    if (snapshot && categories && categories.length > 0) {
      const snapshotCategoriesData = categories.map((cat: { category_id: string; allocated_amount: number }) => ({
        snapshot_id: snapshot.id,
        category_id: cat.category_id,
        allocated_amount: cat.allocated_amount,
      }))

      const { error: snapCatError } = await supabase
        .from('budget_snapshot_categories')
        .insert(snapshotCategoriesData)

      if (snapCatError) {
        console.error('Error creating snapshot categories (non-fatal):', snapCatError)
      }
    }

    // 4. Return the complete plan
    const { data: completePlan } = await supabase
      .from('budget_plans')
      .select(`
        *,
        budget_plan_categories (
          id,
          category_id,
          allocated_amount,
          categories (
            id,
            name,
            color
          )
        )
      `)
      .eq('id', plan.id)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json(completePlan || plan)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, total_amount, currency, categories } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })
    }

    // Fetch the existing plan and verify ownership
    const { data: existingPlan, error: fetchError } = await supabase
      .from('budget_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlan || existingPlan.user_id !== user.id) {
      return NextResponse.json({ error: 'Budget plan not found or access denied' }, { status: 404 })
    }

    // Validate cross-plan category exclusivity for new categories
    if (categories && categories.length > 0) {
      const categoryIds = categories.map((c: { category_id: string }) => c.category_id)
      const oppositePeriod = existingPlan.period === 'monthly' ? 'yearly' : 'monthly'

      const { data: conflicting } = await supabase
        .from('budget_plan_categories')
        .select(`
          category_id,
          budget_plans!inner (period)
        `)
        .eq('budget_plans.user_id', existingPlan.user_id)
        .eq('budget_plans.period', oppositePeriod)
        .in('category_id', categoryIds)

      if (conflicting && conflicting.length > 0) {
        const conflictIds = conflicting.map((c: { category_id: string }) => c.category_id)
        return NextResponse.json(
          { error: `Categories already in ${oppositePeriod} plan: ${conflictIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Update plan fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (total_amount !== undefined) updateData.total_amount = total_amount
    if (currency) updateData.currency = currency

    const { error: updateError } = await supabase
      .from('budget_plans')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating budget plan:', updateError)
      return NextResponse.json({ error: 'Failed to update budget plan' }, { status: 500 })
    }

    // Safe category replacement: insert new first, then delete old
    if (categories) {
      if (categories.length > 0) {
        const planCategoriesData = categories.map((cat: { category_id: string; allocated_amount: number }) => ({
          plan_id: id,
          category_id: cat.category_id,
          allocated_amount: cat.allocated_amount,
        }))

        // Upsert new categories (insert or update if category_id already exists for this plan)
        const { error: catError } = await supabase
          .from('budget_plan_categories')
          .upsert(planCategoriesData, { onConflict: 'plan_id,category_id' })

        if (catError) {
          console.error('Error replacing plan categories:', catError)
          return NextResponse.json({ error: 'Failed to update plan categories' }, { status: 500 })
        }

        // Remove categories that are no longer in the new set
        const newCategoryIds = categories.map((c: { category_id: string }) => c.category_id)
        await supabase
          .from('budget_plan_categories')
          .delete()
          .eq('plan_id', id)
          .not('category_id', 'in', `(${newCategoryIds.join(',')})`)
      } else {
        // Empty categories array — delete all
        await supabase
          .from('budget_plan_categories')
          .delete()
          .eq('plan_id', id)
      }
    }

    // Return updated plan
    const { data: completePlan } = await supabase
      .from('budget_plans')
      .select(`
        *,
        budget_plan_categories (
          id,
          category_id,
          allocated_amount,
          categories (
            id,
            name,
            color
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json(completePlan)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
