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
    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_categories (
          id,
          allocated_amount,
          spent_amount,
          categories (
            id,
            name,
            color
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
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
    const { name, total_amount, amount, period, type, year, month, currency, categories } = body

    // Handle legacy field names if necessary (amount -> total_amount, type -> period)
    const finalTotalAmount = total_amount || amount
    const finalPeriod = period || type
    const finalYear = year || new Date().getFullYear()
    const finalMonth = month || (finalPeriod === 'monthly' ? new Date().getMonth() + 1 : null)
    const finalCurrency = currency || 'IDR'

    if (!name || !finalTotalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create the budget — always use authenticated user's ID
    const insertData = {
      user_id: user.id,
      name,
      period: finalPeriod,
      total_amount: finalTotalAmount,
      currency: finalCurrency,
      month: finalMonth,
      year: finalYear,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .insert(insertData)
      .select()
      .single()

    if (budgetError) {
      console.error('Error creating budget:', budgetError)
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
    }

    // 2. Create budget categories if provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const budgetCategoriesData = categories.map((cat: { category_id: string; allocated_amount: number }) => ({
        budget_id: budget.id,
        category_id: cat.category_id,
        allocated_amount: cat.allocated_amount,
        spent_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .insert(budgetCategoriesData)

      if (categoriesError) {
        console.error('Error creating budget categories:', categoriesError)
        // Rollback: delete the budget we just created
        await supabase.from('budgets').delete().eq('id', budget.id).eq('user_id', user.id)
        return NextResponse.json({ error: 'Failed to create budget categories' }, { status: 500 })
      }
    }

    // 3. Return the complete budget with categories
    const { data: completeBudget, error: fetchError } = await supabase
      .from('budgets')
      .select(`
        *,
        budget_categories (
          id,
          allocated_amount,
          spent_amount,
          categories (
            id,
            name,
            color
          )
        )
      `)
      .eq('id', budget.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching complete budget:', fetchError)
      return NextResponse.json(budget)
    }

    return NextResponse.json(completeBudget)
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

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    // Strip any user_id from updates — never allow changing ownership
    delete updates.user_id

    // Verify ownership before update
    const { data: existing } = await supabase
      .from('budgets')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Budget not found or access denied' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating budgets:', error)
      return NextResponse.json({ error: 'Failed to update budgets' }, { status: 500 })
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
    const id = searchParams.get('budget_id')

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    // Verify ownership before delete
    const { data: existing } = await supabase
      .from('budgets')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Budget not found or access denied' }, { status: 404 })
    }

    const { error } = await supabase
      .from('budgets')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting budget:', error)
      return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
