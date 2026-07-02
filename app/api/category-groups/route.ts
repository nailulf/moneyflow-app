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
    const userId = user.id

    const { data, error } = await supabase
      .from('category_groups')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching category groups:', error)
      
      // If table doesn't exist, return default category groups
      if (error.message?.includes('relation "public.category_groups" does not exist')) {
        return NextResponse.json([
          {
            id: 'temp-expense-group',
            user_id: userId,
            name: 'Expenses',
            type: 'EXPENSE',
            color: 'hsl(var(--destructive))',
            icon: null,
            is_default: true,
            is_active: true,
            sort_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'temp-income-group',
            user_id: userId,
            name: 'Income',
            type: 'INCOME',
            color: 'hsl(var(--success))',
            icon: null,
            is_default: true,
            is_active: true,
            sort_order: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'temp-transfer-group',
            user_id: userId,
            name: 'Transfer',
            type: 'TRANSFER',
            color: 'hsl(var(--muted-foreground))',
            icon: null,
            is_default: true,
            is_active: true,
            sort_order: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
      
      return NextResponse.json({ error: 'Failed to fetch category groups' }, { status: 500 })
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
    const { user_id: bodyUserId, name, type, color, icon, is_default, sort_order } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use session user id
    const user_id = user.id

    // Get the next sort order if not provided
    let finalSortOrder = sort_order
    if (!finalSortOrder) {
      const { data: maxOrderData } = await supabase
        .from('category_groups')
        .select('sort_order')
        .eq('user_id', user_id)
        .order('sort_order', { ascending: false })
        .limit(1)
      
      finalSortOrder = (maxOrderData?.[0]?.sort_order || 0) + 1
    }

    const { data, error } = await supabase
      .from('category_groups')
      .insert({
        user_id,
        name,
        type,
        color: color || '#6B7280',
        icon: icon || null,
        is_default: is_default || false,
        is_active: true,
        sort_order: finalSortOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category group:', error)
      
      // If table doesn't exist, return a mock response
      if (error.message?.includes('relation "public.category_groups" does not exist')) {

        return NextResponse.json({
          id: `temp-${type.toLowerCase()}-${Date.now()}`,
          user_id,
          name,
          type,
          color: color || '#6B7280',
          icon: icon || null,
          is_default: is_default || false,
          is_active: true,
          sort_order: finalSortOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
      
      return NextResponse.json({ error: 'Failed to create category group' }, { status: 500 })
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
    // Never let the client reassign ownership or primary key via mass assignment.
    delete updates.user_id
    delete updates.id

    if (!id) {
      return NextResponse.json({ error: 'Category group ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('category_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure ownership
      .select()
      .single()

    if (error) {
      console.error('Error updating category group:', error)
      return NextResponse.json({ error: 'Failed to update category group' }, { status: 500 })
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
      return NextResponse.json({ error: 'Category group ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if this is a default group
    const { data: groupData } = await supabase
      .from('category_groups')
      .select('is_default, user_id')
      .eq('id', id)
      .single()
    
    if (groupData) {
        if (groupData.user_id !== user.id) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
        if (groupData.is_default) {
            return NextResponse.json({ error: 'Cannot delete default category groups' }, { status: 400 })
        }
    }

    // Soft delete the category group
    const { error } = await supabase
      .from('category_groups')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting category group:', error)
      return NextResponse.json({ error: 'Failed to delete category group' }, { status: 500 })
    }

    // Also soft delete all categories in this group
    await supabase
      .from('categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('category_group_id', id)
      .eq('user_id', user.id) // Ensure ownership of categories too (though group check should suffice if relational integrity holds)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}