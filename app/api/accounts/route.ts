import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const asOfDate = searchParams.get('asOfDate')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If accountId is provided, fetch single account
    if (accountId) {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id) // Ensure user owns the account
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ Error fetching account:', error)
        return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 })
      }

      // If historical balance is requested
      if (includeHistory || asOfDate) {
        const targetDate = asOfDate ? new Date(asOfDate) : new Date()
        
        // Fetch transactions for this account
        const { data: transactions, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('account_id', accountId)
          .eq('user_id', user.id)
          .lte('date', targetDate.toISOString())
          .order('date', { ascending: true })

        if (transactionError) {
          console.error('❌ Error fetching transactions:', transactionError)
          return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
        }

        // Calculate historical balance
         const historicalBalance = calculateAccountBalanceAtDate(transactions || [], targetDate, account.type, account.balance)
        
        return NextResponse.json({
          ...account,
          historicalBalance,
          asOfDate: targetDate.toISOString()
        })
      }

      return NextResponse.json(account)
    }

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    // If historical balances are requested
    if (includeHistory || asOfDate) {
      const targetDate = asOfDate ? new Date(asOfDate) : new Date()
      
      // Fetch all transactions for these accounts
      const accountIds = accounts?.map(account => account.id) || []
      
      if (accountIds.length > 0) {
        const { data: transactions, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', accountIds)
          .eq('user_id', user.id)
          .lte('date', targetDate.toISOString())
          .order('date', { ascending: true })

        if (transactionError) {
          console.error('❌ Error fetching transactions:', transactionError)
          return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
        }

        // Calculate historical balances for each account
         const accountsWithHistory = accounts?.map(account => {
           const accountTransactions = transactions?.filter(t => t.account_id === account.id) || []
           const historicalBalance = calculateAccountBalanceAtDate(accountTransactions, targetDate, account.type, account.balance)
          
          return {
            ...account,
            historicalBalance,
            asOfDate: targetDate.toISOString()
          }
        })

        return NextResponse.json(accountsWithHistory)
      }
    }

    return NextResponse.json(accounts)
  } catch (error: unknown) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, balance, currency, is_default, description } = body

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // If this is being set as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    const insertData = {
      user_id: user.id,
      name,
      type: type || 'BANK',
      balance: balance || 0.00,
      currency: currency || 'USD',
      is_default: is_default || false,
      is_active: true,
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating account:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, type, balance, currency, is_default, is_active, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the account to check user_id
    const { data: existingAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (existingAccount.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If this is being set as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (balance !== undefined) updateData.balance = balance
    if (currency !== undefined) updateData.currency = currency
    if (is_default !== undefined) updateData.is_default = is_default
    if (is_active !== undefined) updateData.is_active = is_active
    if (description !== undefined) updateData.description = description

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating account:', error)
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
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
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('Error deleting account:', error)
            return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
