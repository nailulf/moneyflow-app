import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeHoldingPayload } from '@/lib/portfolio-utils'

interface RouteParams {
  params: Promise<{ accountId: string; holdingId: string }>
}

async function authedHolding(accountId: string, holdingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: account } = await supabase.from('accounts').select('id, user_id').eq('id', accountId).single()
  if (!account) return { error: NextResponse.json({ error: 'Account not found' }, { status: 404 }) }
  if (account.user_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const { data: holding } = await supabase.from('portfolio_holdings').select('id, account_id').eq('id', holdingId).single()
  if (!holding || holding.account_id !== accountId) return { error: NextResponse.json({ error: 'Holding not found' }, { status: 404 }) }
  return { supabase, user }
}

// PUT — update a holding (account_id changes rejected by the sanitizer)
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId } = await context.params
    const ctx = await authedHolding(accountId, holdingId)
    if ('error' in ctx) return ctx.error
    const body = await request.json()
    for (const k of ['quantity', 'purchase_price', 'current_value']) {
      if (k in body) return NextResponse.json({ error: `${k} is derived from transactions and cannot be edited directly` }, { status: 400 })
    }
    const result = sanitizeHoldingPayload(body, { partial: true })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const { data: holding, error } = await ctx.supabase
      .from('portfolio_holdings').update(result.data).eq('id', holdingId).select().single()
    if (error) {
      console.error('[Holdings API] update error:', error)
      return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 })
    }
    return NextResponse.json({ holding })
  } catch (e) {
    console.error('[Holdings API] PUT error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a holding (balance recomputed by the trigger)
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { accountId, holdingId } = await context.params
    const ctx = await authedHolding(accountId, holdingId)
    if ('error' in ctx) return ctx.error
    const { error } = await ctx.supabase.from('portfolio_holdings').delete().eq('id', holdingId)
    if (error) {
      console.error('[Holdings API] delete error:', error)
      return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Holdings API] DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
