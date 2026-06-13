import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRate } from '@/lib/exchange-rate'
import { calculateAccountBalanceAtDate } from '@/lib/net-worth-utils'
import { buildAdjustmentPayload, computeAdjustmentDelta } from '@/lib/adjustment-transaction'

interface RouteParams {
  params: Promise<{ accountId: string }>
}

/**
 * Resolves the "Other" (or "Other Income") category id for the given user and
 * transaction type.  Falls back to data[0] if no exact name match is found —
 * still returns a valid category so the adjustment transaction is always
 * bookable.
 *
 * NOTE: the categories table uses `group_type` (values: 'INCOME'|'EXPENSE'|'TRANSFER'),
 * NOT a `type` column.
 */
async function resolveOtherCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  type: 'INCOME' | 'EXPENSE'
): Promise<string | null> {
  const name = type === 'EXPENSE' ? 'Other' : 'Other Income'
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('group_type', type)
    .order('created_at', { ascending: true })
  if (!data || data.length === 0) return null
  return (data.find(c => c.name === name) ?? data[0]).id
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
// Creates a synthetic balance-adjustment transaction for the delta and logs it
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

    // Investment-account balances are owned by the holdings trigger (5.0); manual
    // adjustment would be silently overwritten by the next holding change.
    if (account.type === 'INVESTMENT') {
      const { count } = await supabase
        .from('portfolio_holdings')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'This investment account\'s balance is the sum of its holdings — edit the assets instead.' },
          { status: 400 }
        )
      }
    }

    // Fetch ALL transactions for this account to compute the true current balance.
    // Include both outbound (account_id) and inbound transfers (to_account_id).
    const { data: accountTxns, error: txError } = await supabase
      .from('transactions')
      .select('amount, type, date, account_id, to_account_id, currency')
      .eq('user_id', user.id)
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({ error: 'Failed to compute current balance' }, { status: 500 })
    }

    // Build cross-currency rate map for this account's currency
    const acctCurrency = account.currency || 'IDR'
    const currencyRates = new Map<string, number>()
    const foreignCurrencies = [...new Set(
      (accountTxns ?? [])
        .map(tx => tx.currency)
        .filter((c): c is string => !!c && c !== acctCurrency)
    )]
    if (foreignCurrencies.length > 0) {
      await Promise.all(foreignCurrencies.map(async (from) => {
        const rate = await getExchangeRate(from, acctCurrency)
        currencyRates.set(`${from}-${acctCurrency}`, rate)
      }))
    }

    // Compute current displayed balance using the same shared function the wallet
    // list uses — guarantees the delta is calculated against what the user sees.
    const currentBalance = calculateAccountBalanceAtDate(
      accountTxns || [],
      new Date(),
      account.type,
      account.balance,
      accountId,
      acctCurrency,
      currencyRates,
    )

    // Determine the delta; returns null when no change is needed
    const delta = computeAdjustmentDelta(new_balance, currentBalance)
    if (!delta) {
      return NextResponse.json({ message: 'Balance already matches; no adjustment created', currentBalance })
    }

    // Resolve the "Other" category for the delta direction
    const categoryId = await resolveOtherCategoryId(supabase, account.user_id, delta.type)

    // Build the synthetic transaction payload
    const payload = buildAdjustmentPayload({
      userId: account.user_id,
      accountId,
      newBalance: new_balance,
      currentBalance,
      categoryId,
      currency: acctCurrency,
      date: (adjustment_date || new Date().toISOString()).split('T')[0],
    })

    if (!payload) {
      // computeAdjustmentDelta already returned non-null above; this is a safety guard
      return NextResponse.json({ message: 'Balance already matches; no adjustment created', currentBalance })
    }

    const { data: adjTxn, error: txnError } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()
    if (txnError) {
      console.error('Error creating adjustment transaction:', txnError)
      return NextResponse.json({ error: 'Failed to create adjustment transaction' }, { status: 500 })
    }

    const { error: logError } = await supabase
      .from('account_balance_adjustments')
      .insert({
        account_id: accountId,
        user_id: account.user_id,
        previous_balance: currentBalance,
        new_balance,
        adjustment_amount: new_balance - currentBalance,
        note: note ?? null,
        transaction_id: adjTxn.id,
        adjustment_date: (adjustment_date || new Date().toISOString()).split('T')[0],
      })
    if (logError) {
      console.error('Adjustment audit-log insert failed (transaction still applied):', logError)
    }

    return NextResponse.json({ success: true, transaction: adjTxn, newBalance: new_balance })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
