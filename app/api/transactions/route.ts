import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { apiTransactionSchema } from '@/lib/validations'

// Validation schema matching TransactionReviewModal data and DB requirements
const TransactionSchema = apiTransactionSchema

export async function GET(request: NextRequest) {
  try {
    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const paramUserId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const categoryId = searchParams.get('categoryId')
    const accountId = searchParams.get('accountId')
    const merchant = searchParams.get('merchant')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (paramUserId && paramUserId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized: User ID mismatch' }, { status: 403 })
    }

    const userId = user.id

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Apply filters
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (merchant) {
      query = query.ilike('merchant', `%${merchant}%`)
    }
    if (search) {
      query = query.or(`description.ilike.%${search}%,merchant.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle bulk insertion if body is an array
    if (Array.isArray(body)) {
      const startTime = performance.now()
      console.log(`[Bulk Import] Starting processing of ${body.length} transactions`)

      if (body.length === 0) {
        return NextResponse.json({ error: 'No transactions to insert' }, { status: 400 })
      }

      // Validate and sanitize each transaction
      const validTransactions = []
      const errors = []
      const warnings: string[] = []

      for (const [index, item] of body.entries()) {
        try {
          // Parse and validate using Zod schema
          const parsed = TransactionSchema.parse(item)
          
          // Check for missing optional but recommended fields
          if (!parsed.merchant) {
            warnings.push(`Transaction at index ${index}: Missing merchant information`)
          }
          if (!parsed.category_id) {
            warnings.push(`Transaction at index ${index}: Missing category assignment`)
          }

          validTransactions.push({
            ...parsed,
            user_id: user.id, // Enforce user_id from session
            created_at: new Date().toISOString()
          })
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            errors.push({
              index,
              description: item.description || 'Unknown',
              errors: (validationError as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
            })
          } else {
             errors.push({
              index,
              error: 'Unknown validation error'
            })
          }
        }
      }

      // Fail if there are validation errors (or could choose to partial import)
      // For strict synchronization, we should probably fail or report back
      if (errors.length > 0) {
        console.error('[Bulk Import] Validation failed for some items:', errors)
        return NextResponse.json({ 
          error: 'Validation failed for some transactions', 
          details: errors,
          warnings 
        }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(validTransactions)
        .select()

      const duration = performance.now() - startTime

      if (error) {
        console.error('[Bulk Import] Database insertion error:', error)
        return NextResponse.json({ 
          error: 'Failed to create bulk transactions',
          details: error.details,
          message: error.message,
          code: error.code
        }, { status: 500 })
      }

      console.log(`[Bulk Import] Successfully inserted ${data?.length} transactions in ${duration.toFixed(2)}ms`)
      if (warnings.length > 0) {
        console.warn('[Bulk Import] Warnings:', warnings)
      }

      return NextResponse.json({ 
        success: true, 
        count: data?.length || 0, 
        transactions: data,
        warnings,
        performance: {
          durationMs: duration,
          itemsPerSecond: (data?.length || 0) / (duration / 1000)
        }
      })
    }

    // Handle single insertion (existing logic)
    const { user_id: bodyUserId, date, description, amount, type, category_id, account_id, to_account_id, merchant, currency, notes, tags, is_recurring, recurring_frequency, recurring_end_date } = body

    if (!date || !description || !amount || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id, // Enforce user_id from session
        date,
        description,
        amount,
        type,
        category_id,
        account_id,
        to_account_id: type === 'TRANSFER' ? to_account_id : null,
        merchant,
        currency: currency || 'IDR',
        notes,
        tags,
        is_recurring: is_recurring || false,
        recurring_frequency,
        recurring_end_date,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ 
        error: 'Failed to create transaction',
        details: error.details,
        message: error.message,
        code: error.code
      }, { status: 500 })
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
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('user_id')
        .eq('id', id)
        .single()
    
    if (!existingTransaction || existingTransaction.user_id !== user.id) {
        return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user still owns it
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction:', error)
      return NextResponse.json({
        error: 'Failed to update transaction',
        details: error.details,
        message: error.message,
        code: error.code
      }, { status: 500 })
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
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership before deleting
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingTransaction || existingTransaction.user_id !== user.id) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting transaction:', error)
      return NextResponse.json({
        error: 'Failed to delete transaction',
        details: error.details,
        message: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
