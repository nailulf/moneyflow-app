import { SupabaseClient } from '@supabase/supabase-js'

interface SnapshotResult {
  monthlySnapshotsCreated: number
  yearlySnapshotsCreated: number
  snapshotsClosed: number
  errors: string[]
}

export async function generateBudgetSnapshots(
  supabase: SupabaseClient
): Promise<SnapshotResult> {
  const result: SnapshotResult = {
    monthlySnapshotsCreated: 0,
    yearlySnapshotsCreated: 0,
    snapshotsClosed: 0,
    errors: [],
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch all budget plans with their categories
  const { data: plans, error: plansError } = await supabase
    .from('budget_plans')
    .select(`
      *,
      budget_plan_categories (
        category_id,
        allocated_amount
      )
    `)

  if (plansError || !plans) {
    result.errors.push(`Failed to fetch plans: ${plansError?.message}`)
    return result
  }

  for (const plan of plans) {
    try {
      const isMonthly = plan.period === 'monthly'
      const snapshotMonth = isMonthly ? currentMonth : null

      // Check if snapshot already exists
      let existsQuery = supabase
        .from('budget_snapshots')
        .select('id')
        .eq('user_id', plan.user_id)
        .eq('period', plan.period)
        .eq('year', currentYear)

      if (isMonthly) {
        existsQuery = existsQuery.eq('month', currentMonth)
      } else {
        existsQuery = existsQuery.is('month', null)
      }

      const { data: existing } = await existsQuery.single()

      if (existing) {
        continue // Snapshot already exists, skip
      }

      // Create new snapshot
      const { data: snapshot, error: snapError } = await supabase
        .from('budget_snapshots')
        .insert({
          user_id: plan.user_id,
          period: plan.period,
          year: currentYear,
          month: snapshotMonth,
          total_amount: plan.total_amount,
          currency: plan.currency,
          status: 'active',
        })
        .select()
        .single()

      if (snapError || !snapshot) {
        result.errors.push(`Failed to create ${plan.period} snapshot for user ${plan.user_id}: ${snapError?.message}`)
        continue
      }

      // Copy plan categories to snapshot
      if (plan.budget_plan_categories && plan.budget_plan_categories.length > 0) {
        const snapCategories = plan.budget_plan_categories.map(
          (c: { category_id: string; allocated_amount: number }) => ({
            snapshot_id: snapshot.id,
            category_id: c.category_id,
            allocated_amount: c.allocated_amount,
          })
        )

        const { error: catError } = await supabase
          .from('budget_snapshot_categories')
          .insert(snapCategories)

        if (catError) {
          result.errors.push(`Failed to copy categories for snapshot ${snapshot.id}: ${catError.message}`)
        }
      }

      if (isMonthly) {
        result.monthlySnapshotsCreated++
      } else {
        result.yearlySnapshotsCreated++
      }

      // Close previous period's snapshot
      if (isMonthly) {
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

        const { data: closed } = await supabase
          .from('budget_snapshots')
          .update({ status: 'closed' })
          .eq('user_id', plan.user_id)
          .eq('period', 'monthly')
          .eq('year', prevYear)
          .eq('month', prevMonth)
          .eq('status', 'active')
          .select('id')

        if (closed && closed.length > 0) {
          result.snapshotsClosed += closed.length
        }
      } else {
        // Close previous year's snapshot
        const { data: closed } = await supabase
          .from('budget_snapshots')
          .update({ status: 'closed' })
          .eq('user_id', plan.user_id)
          .eq('period', 'yearly')
          .eq('year', currentYear - 1)
          .eq('status', 'active')
          .select('id')

        if (closed && closed.length > 0) {
          result.snapshotsClosed += closed.length
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Error processing plan ${plan.id}: ${msg}`)
    }
  }

  return result
}
