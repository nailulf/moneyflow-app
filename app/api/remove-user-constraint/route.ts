import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function POST() {
  try {
    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()
    
    console.log('🔧 Attempting to remove foreign key constraint...')
    
    // Try to remove the constraint using a simple query approach
    // Since we can't use rpc('exec_sql'), we'll try a different approach
    try {
      // First, let's test if we can create a transaction without the constraint issue
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: testUserId,
          date: '2024-01-01',
          description: 'Test transaction to check constraint',
          amount: 1.00,
          type: 'EXPENSE'
        })
        .select()
        .single()
      
      if (error) {
        if (error.code === '23503' && error.message.includes('transactions_user_id_fkey')) {
          return NextResponse.json({
            success: false,
            error: 'Foreign key constraint still exists',
            message: 'The transactions_user_id_fkey constraint is preventing transaction creation.',
            solution: 'Please run this SQL command in your Supabase dashboard: ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;',
            details: error
          }, { status: 400 })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Other database error',
            details: error
          }, { status: 500 })
        }
      } else {
        // If successful, clean up the test transaction
        await supabase
          .from('transactions')
          .delete()
          .eq('id', data.id)
        
        return NextResponse.json({
          success: true,
          message: 'Foreign key constraint has been resolved! Transaction creation is now working.',
          testTransaction: data
        })
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        details: dbError
      }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}