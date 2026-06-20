import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeHoldingPayload, ASSET_CLASSES, type AssetClass } from '@/lib/portfolio-utils'

interface RouteParams {
  params: Promise<{ accountId: string }>
}

async function authedInvestmentAccount(accountId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: account, error } = await supabase
    .from('accounts').select('id, user_id, type, currency').eq('id', accountId).single()
  if (error || !account) return { error: NextResponse.json({ error: 'Account not found' }, { status: 404 }) }
  if (account.user_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (account.type !== 'INVESTMENT') return { error: NextResponse.json({ error: 'Holdings are only for investment accounts' }, { status: 400 }) }
  return { supabase, user, account }
}

// GET — list holdings for the account
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const ctx = await authedInvestmentAccount(accountId)
    if ('error' in ctx) return ctx.error
    const { data: holdings, error } = await ctx.supabase
      .from('portfolio_holdings').select('*').eq('account_id', accountId).order('current_value', { ascending: false })
    if (error) {
      console.error('[Holdings API] list error:', error)
      return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 })
    }
    return NextResponse.json({ holdings: holdings ?? [] })
  } catch (e) {
    console.error('[Holdings API] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a holding + opening BUY atomically via RPC (balance recomputed by triggers)
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const ctx = await authedInvestmentAccount(accountId)
    if ('error' in ctx) return ctx.error
    const body = await request.json() as Record<string, unknown>

    const assetClass = String(body.asset_class ?? '').toUpperCase()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const quantity = Number(body.quantity)
    // Accept both new shape (price_per_unit / transaction_date) and old shape (purchase_price / purchase_date)
    const price = Number(body.price_per_unit ?? body.purchase_price)
    const date = (typeof body.transaction_date === 'string' && body.transaction_date)
      ? body.transaction_date
      : (typeof body.purchase_date === 'string' && body.purchase_date
        ? body.purchase_date
        : new Date().toISOString().slice(0, 10))

    if (!ASSET_CLASSES.includes(assetClass as AssetClass)) return NextResponse.json({ error: 'invalid asset_class' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'quantity must be positive' }, { status: 400 })
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'price_per_unit must be non-negative' }, { status: 400 })
    if (!date) return NextResponse.json({ error: 'transaction_date is required' }, { status: 400 })

    const symbol = typeof body.symbol === 'string' && body.symbol.trim() ? body.symbol.trim() : null
    const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : ctx.account.currency

    const { data: holdingId, error: rpcErr } = await ctx.supabase.rpc('add_investment_asset', {
      p_account_id: accountId, p_user_id: ctx.user.id, p_asset_class: assetClass,
      p_symbol: symbol, p_name: name, p_currency: currency,
      p_quantity: quantity, p_price_per_unit: price, p_transaction_date: date,
    })
    if (rpcErr || !holdingId) {
      console.error('[Holdings API] add-asset rpc error:', rpcErr)
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }
    const { data: holding } = await ctx.supabase.from('portfolio_holdings').select('*').eq('id', holdingId).single()
    return NextResponse.json({ holding }, { status: 201 })
  } catch (e) {
    console.error('[Holdings API] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
