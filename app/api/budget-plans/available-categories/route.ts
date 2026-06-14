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

    if (!period) {
      return NextResponse.json({ error: 'period is required' }, { status: 400 })
    }
    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

    const oppositePeriod = period === 'monthly' ? 'yearly' : 'monthly'

    // Get category IDs already in the opposite period's plan
    const { data: usedCategories } = await supabase
      .from('budget_plan_categories')
      .select(`
        category_id,
        budget_plans!inner (period)
      `)
      .eq('budget_plans.user_id', userId)
      .eq('budget_plans.period', oppositePeriod)

    const usedCategoryIds = (usedCategories || []).map((c: { category_id: string }) => c.category_id)

    // Get all active categories for this user, excluding those in the opposite plan
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('group_type', 'INCOME') // Exclude income categories from budget allocation
      .order('name')

    if (usedCategoryIds.length > 0) {
      // Filter out categories already used in the opposite plan
      // Supabase doesn't have a "not in" for arrays directly, so we use a workaround
      for (const catId of usedCategoryIds) {
        query = query.neq('id', catId)
      }
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching available categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json(categories || [])
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
