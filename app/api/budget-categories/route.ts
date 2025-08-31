import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { budget_id, category_id, allocated_amount, currency = 'IDR' } = await request.json()

    if (!budget_id || !category_id || !allocated_amount) {
      return NextResponse.json({ error: 'Budget ID, category ID, and allocated amount are required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

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