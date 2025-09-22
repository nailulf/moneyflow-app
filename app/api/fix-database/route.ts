import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
  
    
    // First, check if updated_at column exists by trying to select it
    const { data: testData, error: testError } = await supabase
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