import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeTxnPayload } from '@/lib/investment-ledger'

interface RouteParams {
  params: Promise<{ accountId: string; holdingId: string; txnId: string }>
}

async function authedTxn(accountId: string, holdingId: string, txnId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: account } = await supabase.from('accounts').select('id, user_id').eq('id', accountId).single()
  if (!account) return { error: NextResponse.json({ error: 'Account not found' }, { status: 404 }) }
  if (account.user_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const { data: txn } = await supabase
    .from('investment_transactions').select('*').eq('id', txnId).single()
  if (!txn || txn.account_id !== accountId || txn.holding_id !== holdingId) {
    return { error: NextResponse.json({ error: 'Transaction not found' }, { status: 404 }) }
  }
  return { supabase, user, txn }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId, txnId } = await context.params
    const ctx = await authedTxn(accountId, holdingId, txnId)
    if ('error' in ctx) return ctx.error
    const body = await request.json()
    const result = sanitizeTxnPayload(body, { partial: true })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    // Zero-price guard: BUY/SELL with price_per_unit = 0 corrupts the weighted average cost.
    const patch = result.data as Partial<{ type: string; quantity: number; price_per_unit: number; total_amount: number; transaction_date: string }>
    const effectiveType = (patch.type ?? ctx.txn.type) as string
    if (
      (effectiveType === 'BUY' || effectiveType === 'SELL') &&
      patch.price_per_unit !== undefined &&
      patch.price_per_unit <= 0
    ) {
      return NextResponse.json({ error: 'price_per_unit must be greater than 0 for buy/sell' }, { status: 400 })
    }

    // Negative-holding re-check: increasing a SELL's quantity OR decreasing a BUY's quantity
    // must not drive the holding negative.
    if ((effectiveType === 'BUY' || effectiveType === 'SELL') && patch.quantity !== undefined) {
      const { data: holding } = await ctx.supabase
        .from('portfolio_holdings').select('quantity').eq('id', ctx.txn.holding_id).single()
      if (!holding) return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
      // This txn contributes +qty (BUY) or −qty (SELL) to the holding. Re-derive the holding quantity
      // after applying the patched quantity; reject if it would go negative.
      const sign = effectiveType === 'SELL' ? -1 : 1
      const resulting = Number(holding.quantity) + sign * (patch.quantity - Number(ctx.txn.quantity))
      if (resulting < 0) {
        return NextResponse.json({ error: 'This change would make the holding go negative' }, { status: 400 })
      }
    }

    // total_amount must reflect the effective qty × price (sanitizer only derives it when both are present).
    if ((patch.quantity !== undefined || patch.price_per_unit !== undefined) && patch.total_amount === undefined) {
      const q = patch.quantity ?? Number(ctx.txn.quantity)
      const p = patch.price_per_unit ?? Number(ctx.txn.price_per_unit)
      patch.total_amount = Math.round(q * p * 100) / 100
    }

    const { data: txn, error } = await ctx.supabase
      .from('investment_transactions').update(patch).eq('id', txnId).select().single()
    if (error || !txn) {
      console.error('[InvTxn API] update error:', error)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }
    return NextResponse.json({ transaction: txn })
  } catch (e) {
    console.error('[InvTxn API] PUT error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId, txnId } = await context.params
    const ctx = await authedTxn(accountId, holdingId, txnId)
    if ('error' in ctx) return ctx.error
    const { error } = await ctx.supabase.from('investment_transactions').delete().eq('id', txnId)
    if (error) {
      console.error('[InvTxn API] delete error:', error)
      return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[InvTxn API] DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
