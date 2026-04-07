import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!userId || !period || !year) {
      return NextResponse.json({ error: 'userId, period, and year are required' }, { status: 400 })
    }

    if (period === 'monthly' && !month) {
      return NextResponse.json({ error: 'month is required for monthly snapshots' }, { status: 400 })
    }

    const supabase = createServerComponentClient()
    const yearNum = parseInt(year)
    const monthNum = month ? parseInt(month) : null
    const now = new Date()
    const isCurrentPeriod = period === 'monthly'
      ? yearNum === now.getFullYear() && monthNum === now.getMonth() + 1
      : yearNum === now.getFullYear()
    const isFuturePeriod = period === 'monthly'
      ? yearNum > now.getFullYear() || (yearNum === now.getFullYear() && (monthNum || 0) > now.getMonth() + 1)
      : yearNum > now.getFullYear()

    // Try to fetch the snapshot
    let query = supabase
      .from('budget_snapshots')
      .select(`
        *,
        budget_snapshot_categories (
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
      .eq('period', period)
      .eq('year', yearNum)

    if (period === 'monthly' && monthNum) {
      query = query.eq('month', monthNum)
    } else {
      query = query.is('month', null)
    }

    let { data: snapshot, error } = await query.single()

    if (error && error.code === 'PGRST116') {
      // No snapshot found — create on-demand from plan if one exists
      // Fetch the plan for on-demand snapshot creation or future projection
      const { data: plan } = await supabase
        .from('budget_plans')
        .select(`
          *,
          budget_plan_categories (
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
        .eq('period', period)
        .single()

      if (!plan) {
        return NextResponse.json({ noSnapshot: true, noPlan: true }, { status: 404 })
      }

      // For future periods, return a virtual projection (not persisted)
      if (isFuturePeriod) {
        const virtualCategories = (plan.budget_plan_categories || []).map(
          (c: { category_id: string; allocated_amount: number; categories: { id: string; name: string; color: string } }) => ({
            id: `virtual-${c.category_id}`,
            category_id: c.category_id,
            allocated_amount: c.allocated_amount,
            spent_amount: 0,
            categories: c.categories,
          })
        )

        return NextResponse.json({
          id: `virtual-${yearNum}-${monthNum || 0}`,
          user_id: userId,
          period,
          year: yearNum,
          month: monthNum,
          total_amount: plan.total_amount,
          currency: plan.currency,
          status: 'upcoming',
          created_at: new Date().toISOString(),
          budget_snapshot_categories: virtualCategories,
          total_spent: 0,
        })
      }

      // On-demand snapshot creation for current or past periods
      const snapshotInsert: {
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
        year: yearNum,
        month: period === 'monthly' ? monthNum : null,
        total_amount: plan.total_amount,
        currency: plan.currency,
        status: isCurrentPeriod ? 'active' : 'closed',
      }

      const { data: newSnapshot, error: snapError } = await supabase
        .from('budget_snapshots')
        .insert(snapshotInsert)
        .select()
        .single()

      if (snapError || !newSnapshot) {
        console.error('Error creating on-demand snapshot:', snapError)
        return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
      }

      // Copy plan categories to snapshot
      if (plan.budget_plan_categories && plan.budget_plan_categories.length > 0) {
        const snapCategories = plan.budget_plan_categories.map((c: { category_id: string; allocated_amount: number }) => ({
          snapshot_id: newSnapshot.id,
          category_id: c.category_id,
          allocated_amount: c.allocated_amount,
        }))

        const { error: catInsertError } = await supabase
          .from('budget_snapshot_categories')
          .insert(snapCategories)

        if (catInsertError) {
          console.error('Error inserting snapshot categories:', catInsertError)
          // Rollback: delete the snapshot we just created
          await supabase.from('budget_snapshots').delete().eq('id', newSnapshot.id)
          return NextResponse.json({ error: 'Failed to create snapshot categories' }, { status: 500 })
        }
      }

      // Re-fetch the complete snapshot with joins
      const { data: completeSnapshot } = await supabase
        .from('budget_snapshots')
        .select(`
          *,
          budget_snapshot_categories (
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
        .eq('id', newSnapshot.id)
        .single()

      snapshot = completeSnapshot
    } else if (error) {
      console.error('Error fetching snapshot:', error)
      return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 })
    }

    if (!snapshot) {
      return NextResponse.json({ noSnapshot: true }, { status: 404 })
    }

    if (!snapshot.budget_snapshot_categories || snapshot.budget_snapshot_categories.length === 0) {
      const { data: plan } = await supabase
        .from('budget_plans')
        .select(`
          *,
          budget_plan_categories (
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
        .eq('period', period)
        .single()

      if (plan?.budget_plan_categories?.length) {
        const snapCategories = plan.budget_plan_categories.map(
          (c: { category_id: string; allocated_amount: number }) => ({
            snapshot_id: snapshot.id,
            category_id: c.category_id,
            allocated_amount: c.allocated_amount,
          })
        )

        await supabase
          .from('budget_snapshot_categories')
          .upsert(snapCategories, { onConflict: 'snapshot_id,category_id' })

        const { data: refreshedSnapshot } = await supabase
          .from('budget_snapshots')
          .select(`
            *,
            budget_snapshot_categories (
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
          .eq('id', snapshot.id)
          .single()

        if (refreshedSnapshot) {
          snapshot = refreshedSnapshot
        }
      }
    }

    if (isCurrentPeriod) {
      const { data: plan } = await supabase
        .from('budget_plans')
        .select(`
          *,
          budget_plan_categories (
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
        .eq('period', period)
        .single()

      if (plan) {
        if (plan.budget_plan_categories?.length) {
          const snapCategories = plan.budget_plan_categories.map(
            (c: { category_id: string; allocated_amount: number }) => ({
              snapshot_id: snapshot.id,
              category_id: c.category_id,
              allocated_amount: c.allocated_amount,
            })
          )

          // Upsert new/updated categories
          await supabase
            .from('budget_snapshot_categories')
            .upsert(snapCategories, { onConflict: 'snapshot_id,category_id' })

          // Remove categories no longer in the plan
          const planCategoryIds = plan.budget_plan_categories.map(
            (c: { category_id: string }) => c.category_id
          )
          await supabase
            .from('budget_snapshot_categories')
            .delete()
            .eq('snapshot_id', snapshot.id)
            .not('category_id', 'in', `(${planCategoryIds.join(',')})`)
        } else {
          // Plan has no categories — clear snapshot categories
          await supabase
            .from('budget_snapshot_categories')
            .delete()
            .eq('snapshot_id', snapshot.id)
        }

        const { data: refreshedSnapshot } = await supabase
          .from('budget_snapshots')
          .select(`
            *,
            budget_snapshot_categories (
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
          .eq('id', snapshot.id)
          .single()

        if (refreshedSnapshot) {
          snapshot = refreshedSnapshot
        }
      }
    }

    // Calculate actual spending from transactions for each category
    const categoryIds = (snapshot.budget_snapshot_categories || []).map(
      (c: { category_id: string }) => c.category_id
    ).filter(Boolean)

    let spendingByCategory: Record<string, number> = {}

    if (categoryIds.length > 0) {
      // Build date filters for the query
      let transactionQuery = supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', userId)
        .eq('type', 'EXPENSE')
        .in('category_id', categoryIds)

      // Filter by date range based on period
      if (period === 'monthly' && monthNum) {
        const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`
        const endMonth = monthNum === 12 ? 1 : monthNum + 1
        const endYear = monthNum === 12 ? yearNum + 1 : yearNum
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
        transactionQuery = transactionQuery.gte('date', startDate).lt('date', endDate)
      } else {
        const startDate = `${yearNum}-01-01`
        const endDate = `${yearNum + 1}-01-01`
        transactionQuery = transactionQuery.gte('date', startDate).lt('date', endDate)
      }

      const { data: transactions, error: txError } = await transactionQuery

      if (txError) {
        console.error('Error fetching transactions for spending calculation:', txError)
        console.error('Query params:', { userId, categoryIds, period, yearNum, monthNum })
      }

      if (transactions) {
        for (const t of transactions) {
          const catId = t.category_id
          if (catId) {
            spendingByCategory[catId] = (spendingByCategory[catId] || 0) + Math.abs(t.amount)
          }
        }
      }
    } else {
      console.warn('Budget snapshot has no categories — spending will be 0', {
        snapshotId: snapshot.id,
        categoriesCount: (snapshot.budget_snapshot_categories || []).length,
      })
    }

    // Enrich snapshot categories with spending
    const enrichedCategories = (snapshot.budget_snapshot_categories || []).map(
      (cat: { id: string; category_id: string; allocated_amount: number; categories: { id: string; name: string; color: string } }) => ({
        ...cat,
        spent_amount: spendingByCategory[cat.category_id] || 0,
      })
    )

    const totalSpent = Object.values(spendingByCategory).reduce((sum, v) => sum + v, 0)

    return NextResponse.json({
      ...snapshot,
      budget_snapshot_categories: enrichedCategories,
      total_spent: totalSpent,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
