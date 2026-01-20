import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

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
      .eq('user_id', userId)
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
    const body = await request.json()
    const { userId, name, total_amount, amount, period, type, year, month, currency, categories } = body

    // Handle legacy field names if necessary (amount -> total_amount, type -> period)
    const finalTotalAmount = total_amount || amount
    const finalPeriod = period || type
    const finalYear = year || new Date().getFullYear()
    const finalMonth = month || (finalPeriod === 'monthly' ? new Date().getMonth() + 1 : null)
    const finalCurrency = currency || 'IDR'

    if (!userId || !name || !finalTotalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerComponentClient()
    
    // 1. Create the budget
    const insertData = {
      user_id: userId,
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
      const budgetCategoriesData = categories.map((cat: any) => ({
        budget_id: budget.id,
        category_id: cat.category_id,
        allocated_amount: cat.allocated_amount,
        spent_amount: 0, // Initial spent amount is 0
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .insert(budgetCategoriesData)

      if (categoriesError) {
        console.error('Error creating budget categories:', categoriesError)
        // Note: We don't rollback the budget creation here, but we could return a warning
        // or delete the budget if strict atomicity is required.
        // For now, we'll log it and return the budget (user can edit categories later).
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
      .single()

    if (fetchError) {
      console.error('Error fetching complete budget:', fetchError)
      return NextResponse.json(budget) // Return basic budget if fetch fails
    }

    return NextResponse.json(completeBudget)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if(!id){
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    const { data, error } = await supabase
      .from('budgets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('budget_id')

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }

    const supabase = createServerComponentClient()
    const { error } = await supabase
      .from('budgets')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

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
