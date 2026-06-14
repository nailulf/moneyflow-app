import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Never statically collected: this admin route touches the DB and needs runtime env.
export const dynamic = 'force-dynamic'

// Lazily create the service-role client INSIDE the handler. Creating it at module
// scope made `next build` fail just importing this route when env was absent
// (e.g. a preview deploy without Supabase env vars) — "Failed to collect page data".
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST() {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 })
    }

    // First, check if updated_at column exists by trying to select it
    const { error: testError } = await supabase
      .from('transactions')
      .select('updated_at')
      .limit(1)

    if (!testError) {
      return NextResponse.json({
        success: true,
        message: 'updated_at column already exists',
        alreadyExists: true
      })
    }

    // If column doesn't exist, we need to add it manually
    // Since we can't execute DDL through Supabase client, let's try a workaround
    return NextResponse.json(
      {
        error: 'updated_at column missing from transactions table',
        details: testError.message,
        solution: 'Please add the updated_at column manually to the transactions table in your Supabase dashboard or run the migration script directly on your database.'
      },
      { status: 500 }
    )

  } catch (err: unknown) {
    console.error('❌ Unexpected error:', err)
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
