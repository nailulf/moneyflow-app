import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'

const BASE_CURRENCY = 'IDR'

/**
 * POST /api/exchange-rates/snapshot
 *
 * Called by a weekly GitHub Actions cron job. Fetches live rates for every
 * supported currency pair and upserts them into exchange_rate_snapshots.
 * These snapshots serve as a fallback when live APIs are unavailable.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth — same pattern as recurring-transactions
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerComponentClient()

    const nonBaseCurrencies = SUPPORTED_CURRENCIES.filter(c => c !== BASE_CURRENCY)
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const results: Array<{ currency: string; rate: number | null; source: string }> = []
    const errors: Array<{ currency: string; error: string }> = []

    for (const currency of nonBaseCurrencies) {
      let rate: number | null = null
      let source = ''

      // Try Frankfurter first
      try {
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=${currency}&to=${BASE_CURRENCY}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (res.ok) {
          const data = await res.json()
          const r = data?.rates?.[BASE_CURRENCY]
          if (typeof r === 'number' && Number.isFinite(r)) {
            rate = r
            source = 'frankfurter'
          }
        }
      } catch {
        // Fall through to Fawaz
      }

      // Fallback to Fawaz
      if (rate === null) {
        const host = process.env.FAWAZ_CURRENCY_API_HOST || 'currency-api.pages.dev'
        try {
          const res = await fetch(
            `https://${today}.${host}/v1/currencies/${currency.toLowerCase()}.min.json`,
            { signal: AbortSignal.timeout(5000) }
          )
          if (res.ok) {
            const data = await res.json()
            const r = data?.[currency.toLowerCase()]?.[BASE_CURRENCY.toLowerCase()]
            if (typeof r === 'number' && Number.isFinite(r)) {
              rate = r
              source = 'fawaz'
            }
          }
        } catch {
          // Both APIs failed for this currency
        }
      }

      if (rate !== null) {
        results.push({ currency, rate, source })
      } else {
        errors.push({ currency, error: 'Both APIs failed' })
      }
    }

    // Upsert all successful rates
    if (results.length > 0) {
      const rows = results.map(r => ({
        from_currency: r.currency,
        to_currency: BASE_CURRENCY,
        rate: r.rate!,
        snapshot_date: today,
      }))

      const { error: upsertError } = await supabase
        .from('exchange_rate_snapshots')
        .upsert(rows, { onConflict: 'from_currency,to_currency,snapshot_date' })

      if (upsertError) {
        console.error('Error upserting exchange rate snapshots:', upsertError)
        return NextResponse.json({
          error: 'Failed to save snapshots',
          details: upsertError.message,
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      ratesUpdated: results.length,
      rates: results,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Exchange rate snapshot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
