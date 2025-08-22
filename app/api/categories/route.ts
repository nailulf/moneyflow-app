import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const categoryId = searchParams.get('categoryId')

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // If categoryId is provided, fetch single category
    if (categoryId) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching category:', error)
        return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Otherwise, fetch all categories for user
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
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
    const { user_id, name, color, group_type, category_group_id, is_custom } = body

    if (!user_id || !name || (!group_type && !category_group_id)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    const insertData: {
      user_id: string;
      name: string;
      color: string;
      is_custom: boolean;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      category_group_id?: string;
      group_type: string;
    } = {
      user_id,
      name,
      color: color || '#6B7280',
      is_custom: is_custom ?? true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      group_type: group_type || 'EXPENSE' // Default to EXPENSE if not provided
    }

    // Support both old group_type and new category_group_id
    if (category_group_id) {
      insertData.category_group_id = category_group_id
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      
      // If category_group_id column doesn't exist, try without it
      if (error.message?.includes('column "category_group_id" of relation "categories" does not exist')) {
        console.log('category_group_id column does not exist, creating category without it')
        const fallbackData = {
          user_id,
          name,
          color: color || '#6B7280',
          group_type: group_type || 'EXPENSE',
          is_custom: is_custom ?? true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('categories')
          .insert(fallbackData)
          .select()
          .single()
          
        if (fallbackError) {
          console.error('Error creating category (fallback):', fallbackError)
          return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
        }
        
        return NextResponse.json(fallbackResult)
      }
      
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    const { data, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    const { error } = await supabase
      .from('categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}