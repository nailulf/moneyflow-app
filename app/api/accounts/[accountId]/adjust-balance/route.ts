import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRate, SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

interface RouteParams {
  params: Promise<{ accountId: string }>
}

// GET /api/accounts/[accountId]/adjust-balance
// Returns all balance adjustment log entries for the account, newest first
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account ownership
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: adjustments, error } = await supabase
      .from('account_balance_adjustments')
      .select('*')
      .eq('account_id', accountId)
      .order('adjustment_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching balance adjustments:', error)
      return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 })
    }

    return NextResponse.json(adjustments ?? [])
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/accounts/[accountId]/adjust-balance
// Applies a manual balance adjustment and logs it
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const body = await request.json()
    const { new_balance, note, adjustment_date } = body

    // Validate input
    if (typeof new_balance !== 'number' || !isFinite(new_balance)) {
      return NextResponse.json(
        { error: 'new_balance must be a finite number' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch account and verify ownership
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch ALL transactions for this account to compute the true current balance.
    // Include both outbound (account_id) and inbound transfers (to_account_id).
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('type, amount, account_id, to_account_id, currency')
      .eq('user_id', user.id)
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({ error: 'Failed to compute current balance' }, { status: 500 })
    }

    // Build cross-currency rate map for this account's currency
    const acctCurrency = account.currency || 'IDR'
    const crossRates = new Map<string, number>()
    const foreignCurrencies = [...new Set(
      (transactions ?? [])
        .map(tx => tx.currency)
        .filter((c): c is string => !!c && c !== acctCurrency)
    )]
    if (foreignCurrencies.length > 0) {
      await Promise.all(foreignCurrencies.map(async (from) => {
        const rate = await getExchangeRate(from, acctCurrency)
        crossRates.set(`${from}-${acctCurrency}`, rate)
      }))
    }

    // Convert transaction amount to account currency if needed
    const convert = (amount: number, txCurrency?: string) => {
      if (!txCurrency || txCurrency === acctCurrency) return amount
      const rate = crossRates.get(`${txCurrency}-${acctCurrency}`)
      return rate ? amount * rate : amount
    }

    // Compute current displayed balance = account.balance + sum(all tx effects)
    const txEffect = (transactions ?? []).reduce((sum, tx) => {
      const amount = convert(tx.amount, tx.currency)
      if (tx.type === 'INCOME') return sum + amount
      if (tx.type === 'EXPENSE') return sum - amount
      if (tx.type === 'TRANSFER' && tx.to_account_id) {
        if (tx.account_id === accountId) return sum - amount
        if (tx.to_account_id === accountId) return sum + amount
      }
      return sum
    }, 0)
    const currentBalance = account.balance + txEffect

    const adjustmentAmount = new_balance - currentBalance

    // No-op: declared balance already matches current
    if (Math.abs(adjustmentAmount) < 0.01) {
      return NextResponse.json({ message: 'no_change' }, { status: 200 })
    }

    // Back-calculate the new DB balance value so that:
    // newAccountBalanceDb + txEffect = new_balance
    const newAccountBalanceDb = account.balance + adjustmentAmount

    // 1. Update account.balance
    const { data: updatedAccount, error: updateError } = await supabase
      .from('accounts')
      .update({
        balance: newAccountBalanceDb,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating account balance:', updateError)
      return NextResponse.json({ error: 'Failed to update account balance' }, { status: 500 })
    }

    // 2. Insert immutable adjustment log entry
    const { data: adjustment, error: insertError } = await supabase
      .from('account_balance_adjustments')
      .insert({
        account_id: accountId,
        user_id: user.id,
        previous_balance: currentBalance,
        new_balance,
        adjustment_amount: adjustmentAmount,
        note: note ?? null,
        adjustment_date: adjustment_date ?? new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting adjustment log:', insertError)
      // Account balance was already updated — log the inconsistency but don't fail the request
      return NextResponse.json(
        { error: 'Balance updated but failed to write adjustment log' },
        { status: 500 }
      )
    }

    return NextResponse.json({ account: updatedAccount, adjustment }, { status: 200 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
