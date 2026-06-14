import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Verify the calling user owns the parent budget
async function verifyBudgetOwnership(supabase: SupabaseClient, budgetId: string, userId: string) {
  const { data: budget } = await supabase
    .from('budgets')
    .select('user_id')
    .eq('id', budgetId)
    .single()
  return !!budget && budget.user_id === userId
}

// Verify the calling user owns the budget_category via its parent budget
async function verifyBudgetCategoryOwnership(supabase: SupabaseClient, id: string, userId: string) {
  const { data: bc } = await supabase
    .from('budget_categories')
    .select('budget_id, budgets!inner(user_id)')
    .eq('id', id)
    .single()
  if (!bc) return false
  const budget = Array.isArray(bc.budgets) ? bc.budgets[0] : bc.budgets
  return budget?.user_id === userId
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { budget_id, category_id, allocated_amount, currency = 'IDR' } = await request.json()

    if (!budget_id || !category_id || !allocated_amount) {
      return NextResponse.json({ error: 'Budget ID, category ID, and allocated amount are required' }, { status: 400 })
    }

    if (!(await verifyBudgetOwnership(supabase, budget_id, user.id))) {
      return NextResponse.json({ error: 'Budget not found or access denied' }, { status: 404 })
    }

    const insertData = {
      budget_id,
      category_id,
      allocated_amount,
      spent_amount: 0,
      currency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('budget_categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating budget category:', error)
      return NextResponse.json({ error: 'Failed to create budget category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
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

    const { id, budget_id, category_id, allocated_amount, currency = 'IDR' } = await request.json()

    if (!id || !budget_id || !category_id || !allocated_amount) {
      return NextResponse.json({ error: 'ID, budget ID, category ID, and allocated amount are required' }, { status: 400 })
    }

    if (!(await verifyBudgetCategoryOwnership(supabase, id, user.id))) {
      return NextResponse.json({ error: 'Budget category not found or access denied' }, { status: 404 })
    }

    const updateData = {
      budget_id,
      category_id,
      allocated_amount,
      currency,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('budget_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating budget category:', error)
      return NextResponse.json({ error: 'Failed to update budget category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Budget category ID is required' }, { status: 400 })
    }

    if (!(await verifyBudgetCategoryOwnership(supabase, id, user.id))) {
      return NextResponse.json({ error: 'Budget category not found or access denied' }, { status: 404 })
    }

    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting budget category:', error)
      return NextResponse.json({ error: 'Failed to delete budget category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budgetId')

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    if (!(await verifyBudgetOwnership(supabase, budgetId, user.id))) {
      return NextResponse.json({ error: 'Budget not found or access denied' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('budget_id', budgetId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching budget categories:', error)
      return NextResponse.json({ error: 'Failed to fetch budget categories' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
