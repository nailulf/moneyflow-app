import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'
import { getExchangeRate, SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'
import { sanitizeAccountPayload, sanitizeAccountUpdate } from '@/lib/account-payload'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Build a Map of "FROM-TO" → rate for converting any supported currency
 * to the target account currency. Uses live rates with DB snapshot fallback.
 */
async function buildCrossRateMap(targetCurrency: string): Promise<Map<string, number>> {
  const rates = new Map<string, number>()
  const others = SUPPORTED_CURRENCIES.filter(c => c !== targetCurrency)
  await Promise.all(
    others.map(async (from) => {
      const rate = await getExchangeRate(from, targetCurrency)
      rates.set(`${from}-${targetCurrency}`, rate)
    })
  )
  return rates
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const includeHistory = searchParams.get('includeHistory') === 'true'
    const asOfDate = searchParams.get('asOfDate')
    const type = searchParams.get('type')

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
        
        // Fetch transactions for this account (including inbound transfers)
        const { data: transactions, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
          .lte('date', targetDate.toISOString())
          .order('date', { ascending: true })

        if (transactionError) {
          console.error('❌ Error fetching transactions:', transactionError)
          return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
        }

        // Calculate historical balance with cross-currency conversion
         const crossRates = await buildCrossRateMap(account.currency || 'IDR')
         const historicalBalance = calculateAccountBalanceAtDate(transactions || [], targetDate, account.type, account.balance, accountId, account.currency, crossRates)
        
        return NextResponse.json({
          ...account,
          historicalBalance,
          asOfDate: targetDate.toISOString()
        })
      }

      return NextResponse.json(account)
    }

    let accountsQuery = supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (type) {
      accountsQuery = accountsQuery.eq('type', type.toUpperCase())
    }

    const { data: accounts, error } = await accountsQuery
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
        const accountIdList = accountIds.map(id => `"${id}"`).join(',')
        const { data: transactions, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .or(`account_id.in.(${accountIdList}),to_account_id.in.(${accountIdList})`)
          .lte('date', targetDate.toISOString())
          .order('date', { ascending: true })

        if (transactionError) {
          console.error('❌ Error fetching transactions:', transactionError)
          return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
        }

        // Calculate historical balances for each account with cross-currency conversion
        // Build rate maps for each unique account currency
        const uniqueAccountCurrencies = [...new Set(accounts?.map(a => a.currency || 'IDR') || [])]
        const rateMaps = new Map<string, Map<string, number>>()
        await Promise.all(
          uniqueAccountCurrencies.map(async (cur) => {
            rateMaps.set(cur, await buildCrossRateMap(cur))
          })
        )

        // Include transactions where this account is either source or destination
         const accountsWithHistory = accounts?.map(account => {
           const accountTransactions = transactions?.filter(t => t.account_id === account.id || t.to_account_id === account.id) || []
           const acctCurrency = account.currency || 'IDR'
           const historicalBalance = calculateAccountBalanceAtDate(accountTransactions, targetDate, account.type, account.balance, account.id, acctCurrency, rateMaps.get(acctCurrency))
          
          return {
            ...account,
            historicalBalance,
            asOfDate: targetDate.toISOString()
          }
        })

        return NextResponse.json(accountsWithHistory)
      }
    }

    if (!accounts || accounts.length === 0) return NextResponse.json([])

    const liveAccountIds = accounts.map(a => a.id)
    const accountIdList = liveAccountIds.map(id => `"${id}"`).join(',')
    const { data: txns, error: txErr } = await supabase
      .from('transactions')
      .select('amount, type, date, account_id, to_account_id, currency')
      .eq('user_id', user.id)
      .or(`account_id.in.(${accountIdList}),to_account_id.in.(${accountIdList})`)
    if (txErr) {
      console.error('❌ Error fetching transactions for balances:', txErr)
      return NextResponse.json({ error: 'Failed to compute balances' }, { status: 500 })
    }

    const uniqueCurrencies = [...new Set(accounts.map(a => a.currency || 'IDR'))]
    const rateMaps = new Map<string, Map<string, number>>()
    await Promise.all(uniqueCurrencies.map(async (cur) => { rateMaps.set(cur, await buildCrossRateMap(cur)) }))

    const now = new Date()
    const withBalances = accounts.map(account => {
      const accountTxns = (txns || []).filter(t => t.account_id === account.id || t.to_account_id === account.id)
      const cur = account.currency || 'IDR'
      const computed = calculateAccountBalanceAtDate(accountTxns, now, account.type, account.balance, account.id, cur, rateMaps.get(cur))
      return { ...account, balance: computed }
    })
    return NextResponse.json(withBalances)
  } catch (error: unknown) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit(`mutation:${user.id}`, RATE_LIMITS.mutation)
    if (limited) return limited

    const result = sanitizeAccountPayload(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // If this is being set as default, unset other defaults first
    if (result.data.is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    const insertData = {
      user_id: user.id,
      ...result.data,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const result = sanitizeAccountUpdate(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await enforceRateLimit(`mutation:${user.id}`, RATE_LIMITS.mutation)
    if (limited) return limited

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
    if (result.data.is_default) {
      await supabase
        .from('accounts')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    const updateData = {
      ...result.data,
      updated_at: new Date().toISOString(),
    }

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

        const limited = await enforceRateLimit(`mutation:${user.id}`, RATE_LIMITS.mutation)
        if (limited) return limited

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
