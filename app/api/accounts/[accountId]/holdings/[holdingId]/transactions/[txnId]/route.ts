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
    const patch = result.data as Partial<{ type: string; price_per_unit: number; total_amount: number; transaction_date: string }>
    const effectiveType = (patch.type ?? ctx.txn.type) as string
    if (
      (effectiveType === 'BUY' || effectiveType === 'SELL') &&
      patch.price_per_unit !== undefined &&
      patch.price_per_unit <= 0
    ) {
      return NextResponse.json({ error: 'price_per_unit must be greater than 0 for buy/sell' }, { status: 400 })
    }

    const { data: txn, error } = await ctx.supabase
      .from('investment_transactions').update(result.data).eq('id', txnId).select().single()
    if (error || !txn) {
      console.error('[InvTxn API] update error:', error)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    // Keep the linked cash inflow consistent (amount/date) if one exists.
    let cashSyncMessage: string | null = null
    if (patch.total_amount !== undefined || patch.transaction_date !== undefined) {
      const cashPatch: Record<string, unknown> = {}
      if (patch.total_amount !== undefined) cashPatch.amount = patch.total_amount
      if (patch.transaction_date !== undefined) cashPatch.date = patch.transaction_date
      const { error: cashSyncError } = await ctx.supabase
        .from('transactions').update(cashPatch).eq('source_investment_txn_id', txnId)
      if (cashSyncError) {
        console.error('[InvTxn API] cash-leg sync error (non-fatal):', cashSyncError)
        cashSyncMessage = 'Failed to sync the linked cash transaction; the investment edit was saved.'
      }
    }

    return NextResponse.json(
      cashSyncMessage ? { transaction: txn, cash_sync_error: cashSyncMessage } : { transaction: txn }
    )
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
    // Remove the linked cash inflow first, then the ledger row (recompute fires on delete).
    const { error: cashDeleteError } = await ctx.supabase
      .from('transactions').delete().eq('source_investment_txn_id', txnId)
    if (cashDeleteError) {
      console.error('[InvTxn API] cash-leg delete error:', cashDeleteError)
      return NextResponse.json({ error: 'Failed to delete cash transaction' }, { status: 500 })
    }
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
