import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budgetId')

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // Query budget_categories with category information
    const { data, error } = await supabase
      .from('budget_categories')
      .select(`
        id,
        budget_id,
        category_id,
        allocated_amount,
        spent_amount,
        currency,
        created_at,
        updated_at,
        categories!inner(
          id,
          name,
          color
        )
      `)
      .eq('budget_id', budgetId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching budget items:', error)
      return NextResponse.json({ error: 'Failed to fetch budget items' }, { status: 500 })
    }

    // Transform the data to match the expected BudgetItem interface
    const budgetItems = data.map(item => {
      const category = Array.isArray(item.categories) ? item.categories[0] : item.categories
      return {
        id: item.id,
        budget_id: item.budget_id,
        category_id: item.category_id,
        allocated_amount: item.allocated_amount,
        spent_amount: item.spent_amount,
        currency: item.currency,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category_name: category?.name || 'Unknown Category',
        category_color: category?.color || '#6B7280'
      }
    })

    return NextResponse.json(budgetItems)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}