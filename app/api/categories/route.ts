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
    const categoryId = searchParams.get('categoryId')

    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If categoryId is provided, fetch single category (scoped to user)
    if (categoryId) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching category:', error)
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color, group_type, category_group_id, is_custom } = body

    if (!name || (!group_type && !category_group_id)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const insertData: {
      user_id: string
      name: string
      color: string
      is_custom: boolean
      is_active: boolean
      created_at: string
      updated_at: string
      category_group_id: string
      group_type: string
    } = {
      user_id: user.id,
      name,
      color: color || '#6B7280',
      is_custom: is_custom ?? true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_group_id: category_group_id,
      group_type: group_type || 'EXPENSE'
    }

    // Revive an existing soft-deleted row with the same (user, name, group)
    // before attempting an insert. The unique constraint covers all rows
    // (active or not), so a fresh insert would otherwise collide with a
    // category the user previously deleted. Migration 047 makes the index
    // partial, but this fallback keeps the API working before/after that
    // migration is applied.
    const { data: existingInactive } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', insertData.name)
      .eq('group_type', insertData.group_type)
      .eq('is_active', false)
      .maybeSingle()

    if (existingInactive?.id) {
      const { data: revived, error: reviveError } = await supabase
        .from('categories')
        .update({
          is_active: true,
          color: insertData.color,
          is_custom: insertData.is_custom,
          category_group_id: insertData.category_group_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInactive.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (reviveError) {
        console.error('Error reviving soft-deleted category:', reviveError)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
      }
      return NextResponse.json(revived)
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)

      // Friendlier message for the unique-name collision so the UI can show
      // "name already in use" instead of a generic 500.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists in this group' },
          { status: 409 }
        )
      }

      // If category_group_id column doesn't exist, try without it
      if (error.message?.includes('column "category_group_id" of relation "categories" does not exist')) {
        const fallbackData = {
          user_id: user.id,
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    delete updates.user_id

    // Verify ownership and grab the row's group_type so we can free up
    // soft-deleted slot squatters if a rename collides.
    const { data: existing } = await supabase
      .from('categories')
      .select('user_id, group_type')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 })
    }

    const performUpdate = async () =>
      supabase
        .from('categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    let { data, error } = await performUpdate()

    // Collision recovery: the unique constraint on migration 001 covers all
    // rows including soft-deleted ones. If the user is renaming a category
    // to a name that's currently held by an inactive row, free the slot by
    // tombstoning the squatter's name (appending the row id) and retry.
    // Migration 047 makes this path unreachable on databases that ran it.
    if (error && error.code === '23505' && typeof updates.name === 'string') {
      const { data: squatter } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', updates.name)
        .eq('group_type', existing.group_type)
        .eq('is_active', false)
        .neq('id', id)
        .maybeSingle()

      if (squatter?.id) {
        await supabase
          .from('categories')
          .update({
            name: `${updates.name} (deleted ${squatter.id.slice(0, 8)})`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', squatter.id)
          .eq('user_id', user.id)

        ;({ data, error } = await performUpdate())
      }
    }

    if (error) {
      console.error('Error updating category:', error)
      // Friendlier message for the unique-name collision so the UI can show
      // "name already in use" instead of a generic 500.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists in this group' },
          { status: 409 }
        )
      }
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('category_id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('categories')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Category not found or access denied' }, { status: 404 })
    }

    const { error } = await supabase
      .from('categories')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)

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
