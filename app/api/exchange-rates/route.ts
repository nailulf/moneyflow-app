import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRate, SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

const SUPPORTED = SUPPORTED_CURRENCIES as readonly string[]

/**
 * GET /api/exchange-rates?from=USD&to=IDR
 *
 * Thin authenticated wrapper over `getExchangeRate` so client components (e.g. the
 * portfolio detail screen) can convert holding values to a base currency. Reuses the
 * server-side cache + Frankfurter → Fawaz → DB-snapshot fallback chain.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const from = (searchParams.get('from') || '').toUpperCase()
    const to = (searchParams.get('to') || 'IDR').toUpperCase()

    if (!SUPPORTED.includes(from) || !SUPPORTED.includes(to)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }

    const rate = await getExchangeRate(from, to)
    return NextResponse.json({ from, to, rate })
  } catch (e) {
    console.error('[ExchangeRates API] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
