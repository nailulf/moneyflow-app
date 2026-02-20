import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createServerComponentClient()

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
      .eq('user_id', userId)

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
    const body = await request.json()
    const { userId, period, total_amount, currency, categories } = body

    if (!userId || !period || total_amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: userId, period, total_amount' }, { status: 400 })
    }

    if (!['monthly', 'yearly'].includes(period)) {
      return NextResponse.json({ error: 'period must be "monthly" or "yearly"' }, { status: 400 })
    }

    const supabase = createServerComponentClient()

    // Check if a plan already exists for this period
    const { data: existing } = await supabase
      .from('budget_plans')
      .select('id')
      .eq('user_id', userId)
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
        .eq('budget_plans.user_id', userId)
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
        user_id: userId,
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

    // 2. Create plan categories
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
      }
    }

    // 3. Auto-create snapshot for current period (first-time setup)
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
      user_id: userId,
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

      await supabase
        .from('budget_snapshot_categories')
        .insert(snapshotCategoriesData)
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
      .single()

    return NextResponse.json(completePlan || plan)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, total_amount, currency, categories } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan id is required' }, { status: 400 })
    }

    const supabase = createServerComponentClient()

    // Fetch the existing plan to get user_id and period
    const { data: existingPlan, error: fetchError } = await supabase
      .from('budget_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingPlan) {
      return NextResponse.json({ error: 'Budget plan not found' }, { status: 404 })
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

    if (updateError) {
      console.error('Error updating budget plan:', updateError)
      return NextResponse.json({ error: 'Failed to update budget plan' }, { status: 500 })
    }

    // Full category replacement if categories provided
    if (categories) {
      // Delete all existing categories for this plan
      await supabase
        .from('budget_plan_categories')
        .delete()
        .eq('plan_id', id)

      // Insert new categories
      if (categories.length > 0) {
        const planCategoriesData = categories.map((cat: { category_id: string; allocated_amount: number }) => ({
          plan_id: id,
          category_id: cat.category_id,
          allocated_amount: cat.allocated_amount,
        }))

        const { error: catError } = await supabase
          .from('budget_plan_categories')
          .insert(planCategoriesData)

        if (catError) {
          console.error('Error replacing plan categories:', catError)
          return NextResponse.json({ error: 'Failed to update plan categories' }, { status: 500 })
        }
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
      .single()

    return NextResponse.json(completePlan)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
