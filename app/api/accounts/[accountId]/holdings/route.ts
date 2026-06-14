import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeHoldingPayload } from '@/lib/portfolio-utils'

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

// POST — create a holding (balance is recomputed by the DB trigger)
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { accountId } = await context.params
    const ctx = await authedInvestmentAccount(accountId)
    if ('error' in ctx) return ctx.error
    const body = await request.json()
    const result = sanitizeHoldingPayload(body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const { data: holding, error } = await ctx.supabase
      .from('portfolio_holdings')
      .insert({ ...result.data, account_id: accountId, user_id: ctx.user.id })  // user_id server-derived
      .select().single()
    if (error) {
      console.error('[Holdings API] create error:', error)
      return NextResponse.json({ error: 'Failed to create holding' }, { status: 500 })
    }
    return NextResponse.json({ holding }, { status: 201 })
  } catch (e) {
    console.error('[Holdings API] POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
