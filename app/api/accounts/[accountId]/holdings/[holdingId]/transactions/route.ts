import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeTxnPayload, realizedPl, SanitizedTxn } from '@/lib/investment-ledger'

interface RouteParams {
  params: Promise<{ accountId: string; holdingId: string }>
}

async function authedHolding(accountId: string, holdingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: account } = await supabase.from('accounts').select('id, user_id, type, currency').eq('id', accountId).single()
  if (!account) return { error: NextResponse.json({ error: 'Account not found' }, { status: 404 }) }
  if (account.user_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (account.type !== 'INVESTMENT') return { error: NextResponse.json({ error: 'Holdings are only for investment accounts' }, { status: 400 }) }
  const { data: holding } = await supabase
    .from('portfolio_holdings').select('id, account_id, name, symbol, quantity, purchase_price, currency').eq('id', holdingId).single()
  if (!holding || holding.account_id !== accountId) return { error: NextResponse.json({ error: 'Holding not found' }, { status: 404 }) }
  return { supabase, user, account, holding }
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId } = await context.params
    const ctx = await authedHolding(accountId, holdingId)
    if ('error' in ctx) return ctx.error
    const { data: transactions, error } = await ctx.supabase
      .from('investment_transactions').select('*').eq('holding_id', holdingId)
      .order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    if (error) {
      console.error('[InvTxn API] list error:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
    return NextResponse.json({ transactions: transactions ?? [] })
  } catch (e) {
    console.error('[InvTxn API] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId } = await context.params
    const ctx = await authedHolding(accountId, holdingId)
    if ('error' in ctx) return ctx.error
    const body = await request.json()
    const result = sanitizeTxnPayload(body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const data = result.data as SanitizedTxn

    // Zero-price guard: BUY/SELL with price_per_unit = 0 would corrupt the weighted average cost.
    if ((data.type === 'BUY' || data.type === 'SELL') && data.price_per_unit <= 0) {
      return NextResponse.json({ error: 'price_per_unit must be greater than 0 for buy/sell' }, { status: 400 })
    }

    // SELL: cannot sell more than currently held; compute realized P/L at current avg cost.
    let realized: number | null = null
    if (data.type === 'SELL') {
      if (data.quantity > Number(ctx.holding.quantity)) {
        return NextResponse.json({ error: 'Cannot sell more units than you hold' }, { status: 400 })
      }
      realized = realizedPl(data.quantity, Number(ctx.holding.purchase_price), data.total_amount)
    }

    // Validate the opt-in cash account (must be the user's own, non-investment).
    let cashAccountId: string | null = null
    if (data.type === 'SELL' && data.cash_account_id) {
      const { data: cash } = await ctx.supabase.from('accounts').select('id, user_id, type').eq('id', data.cash_account_id).single()
      if (!cash || cash.user_id !== ctx.user.id) return NextResponse.json({ error: 'Invalid cash account' }, { status: 400 })
      cashAccountId = cash.id
    }

    const { data: txn, error } = await ctx.supabase
      .from('investment_transactions')
      .insert({
        holding_id: holdingId, account_id: accountId, user_id: ctx.user.id,
        type: data.type, quantity: data.quantity, price_per_unit: data.price_per_unit,
        total_amount: data.total_amount, realized_pl: realized, cash_account_id: cashAccountId,
        transaction_date: data.transaction_date, currency: data.currency ?? ctx.holding.currency, notes: data.notes ?? null,
      })
      .select().single()
    if (error || !txn) {
      console.error('[InvTxn API] create error:', error)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    // Opt-in: deposit proceeds as a single INCOME transaction on the chosen cash account.
    if (cashAccountId) {
      const { error: cashErr } = await ctx.supabase.from('transactions').insert({
        user_id: ctx.user.id, account_id: cashAccountId, type: 'INCOME',
        amount: data.total_amount, currency: data.currency ?? ctx.holding.currency,
        date: data.transaction_date,
        description: `Sale of ${ctx.holding.symbol || ctx.holding.name}`,
        source_investment_txn_id: txn.id,
      })
      if (cashErr) console.error('[InvTxn API] cash inflow error (non-fatal):', cashErr)
    }

    return NextResponse.json({ transaction: txn }, { status: 201 })
  } catch (e) {
    console.error('[InvTxn API] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
