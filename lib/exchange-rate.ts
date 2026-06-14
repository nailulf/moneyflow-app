/**
 * Exchange rate utilities using Frankfurter API (https://api.frankfurter.app)
 * Free, no API key required. Covers ~33 currencies including IDR.
 * Data sourced from European Central Bank (ECB).
 *
 * Caching strategy: module-level Map, keyed by YYYY-MM per currency pair.
 * Monthly granularity is sufficient — uses the 15th of the month as a
 * proxy for the monthly average rate.
 */

interface CachedRate {
  rate: number
  fetchedAt: number
}

export const SUPPORTED_CURRENCIES = [
  'IDR',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'SGD',
  'MYR',
  'AED',
  'SAR'
] as const

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

const SUPPORTED_CURRENCY_SET = new Set<SupportedCurrency>(SUPPORTED_CURRENCIES)

const rateCache = new Map<string, CachedRate>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const FAWAZ_CURRENCY_API_HOST = process.env.FAWAZ_CURRENCY_API_HOST || 'currency-api.pages.dev'

async function fetchRateFromFrankfurter(from: string, to: string, dateStr: string): Promise<number | null> {
  const url = `https://api.frankfurter.app/${dateStr}?from=${from}&to=${to}`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error(`[ExchangeRate] Frankfurter returned ${res.status} for ${from}→${to} on ${dateStr}`)
      return null
    }

    const data = await res.json()
    const rate = data?.rates?.[to]
    return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
  } catch (err) {
    console.error(`[ExchangeRate] Frankfurter fetch failed for ${from}→${to}:`, err instanceof Error ? err.message : err)
    return null
  }
}

async function fetchRateFromFawaz(from: string, to: string, dateStr: string): Promise<number | null> {
  const fromLower = from.toLowerCase()
  const toLower = to.toLowerCase()
  const url = `https://${dateStr}.${FAWAZ_CURRENCY_API_HOST}/v1/currencies/${fromLower}.min.json`

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error(`[ExchangeRate] Fawaz returned ${res.status} for ${from}→${to} on ${dateStr}`)
      return null
    }

    const data = await res.json()
    const rate = data?.[fromLower]?.[toLower]
    return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
  } catch (err) {
    console.error(`[ExchangeRate] Fawaz fetch failed for ${from}→${to}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Fallback: query the most recent snapshot from the DB.
 * Returns null if no snapshot exists or DB is unavailable.
 */
async function fetchRateFromSnapshot(from: string, to: string): Promise<number | null> {
  try {
    // Dynamic import to avoid circular dependency issues at module load time
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = createServerComponentClient()

    const { data, error } = await supabase
      .from('exchange_rate_snapshots')
      .select('rate')
      .eq('from_currency', from)
      .eq('to_currency', to)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    const rate = Number(data.rate)
    return Number.isFinite(rate) ? rate : null
  } catch (err) {
    console.error(`[ExchangeRate] DB snapshot lookup failed for ${from}→${to}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Get exchange rate from `from` to `to` currency at a given date.
 * Uses mid-month (15th) as a monthly average approximation.
 * Falls back to 1:1 if the API is unavailable.
 */
function normalizeCurrency(code: string): SupportedCurrency {
  const normalized = code.toUpperCase().trim()
  return SUPPORTED_CURRENCY_SET.has(normalized as SupportedCurrency)
    ? (normalized as SupportedCurrency)
    : 'IDR'
}

export async function getExchangeRate(
  from: string,
  to: string,
  date?: Date
): Promise<number> {
  const normalizedFrom = normalizeCurrency(from)
  const normalizedTo = normalizeCurrency(to)
  if (normalizedFrom === normalizedTo) return 1

  // Clamp to mid-month for monthly average approximation
  const refDate = date
    ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), 15))
    : new Date()

  // Don't query future dates — clamp to today
  const today = new Date()
  if (refDate > today) refDate.setTime(today.getTime())

  const yyyyMM = refDate.toISOString().slice(0, 7) // YYYY-MM
  const cacheKey = `${normalizedFrom}-${normalizedTo}-${yyyyMM}`

  const cached = rateCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate
  }

  const dateStr = refDate.toISOString().slice(0, 10) // YYYY-MM-DD

  // 1. Try Frankfurter API
  const primaryRate = await fetchRateFromFrankfurter(normalizedFrom, normalizedTo, dateStr)
  if (primaryRate !== null) {
    rateCache.set(cacheKey, { rate: primaryRate, fetchedAt: Date.now() })
    return primaryRate
  }

  // 2. Try Fawaz API
  const fallbackRate = await fetchRateFromFawaz(normalizedFrom, normalizedTo, dateStr)
  if (fallbackRate !== null) {
    rateCache.set(cacheKey, { rate: fallbackRate, fetchedAt: Date.now() })
    return fallbackRate
  }

  // 3. Use stale in-memory cache (expired TTL but better than nothing)
  if (cached) {
    console.warn(`[ExchangeRate] Using stale cached rate for ${cacheKey} (age: ${Math.round((Date.now() - cached.fetchedAt) / 60000)}min)`)
    return cached.rate
  }

  // 4. Query DB snapshot (weekly baseline)
  const snapshotRate = await fetchRateFromSnapshot(normalizedFrom, normalizedTo)
  if (snapshotRate !== null) {
    console.warn(`[ExchangeRate] Using DB snapshot rate for ${normalizedFrom}→${normalizedTo}`)
    rateCache.set(cacheKey, { rate: snapshotRate, fetchedAt: Date.now() })
    return snapshotRate
  }

  // 5. All sources exhausted — this should be very rare
  console.error(`[ExchangeRate] ALL sources failed for ${normalizedFrom}→${normalizedTo}. Returning 1 (no conversion).`)
  return 1
}

/**
 * Batch-fetch exchange rates for multiple (currency, date) combinations.
 * Returns a map keyed by `${from}-${YYYY-MM}` → rate (to baseCurrency).
 *
 * De-duplicates requests by YYYY-MM so we only call the API once per
 * currency per month regardless of how many data points share that month.
 */
export async function batchGetExchangeRates(
  currencies: string[],
  baseCurrency: string,
  dates: Date[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()

  const normalizedBase = normalizeCurrency(baseCurrency)
  const normalizedCurrencies = currencies.map((c) => normalizeCurrency(c))
  const uniqueCurrencies = [...new Set(normalizedCurrencies.filter((c) => c !== normalizedBase))]
  if (uniqueCurrencies.length === 0) return result

  const uniqueMonths = [
    ...new Set(
      dates.map(
        (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      )
    ),
  ]

  const fetches: Promise<void>[] = []

  for (const currency of uniqueCurrencies) {
    for (const yyyyMM of uniqueMonths) {
      const [year, month] = yyyyMM.split('-').map(Number)
      fetches.push(
        getExchangeRate(currency, normalizedBase, new Date(year, month - 1, 15)).then(
          (rate) => {
            result.set(`${currency}-${yyyyMM}`, rate)
          }
        )
      )
    }
  }

  await Promise.all(fetches)
  return result
}

/**
 * Look up a rate from a pre-fetched batch map.
 * Returns 1 (no conversion) if the currency matches the base or rate is missing.
 */
export function lookupRate(
  rateMap: Map<string, number>,
  fromCurrency: string,
  baseCurrency: string,
  date: Date
): number {
  const normalizedFrom = normalizeCurrency(fromCurrency)
  const normalizedBase = normalizeCurrency(baseCurrency)
  if (normalizedFrom === normalizedBase) return 1
  const yyyyMM = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return rateMap.get(`${normalizedFrom}-${yyyyMM}`) ?? 1
}
