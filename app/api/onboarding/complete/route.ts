import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import type { UserOnboardingDB } from '@/types/database'

/**
 * POST /api/onboarding/complete
 * Marks the onboarding as completed for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, summary } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // Get current onboarding state to calculate duration
    const { data: currentState } = await supabase
      .from('user_onboarding')
      .select('created_at')
      .eq('user_id', userId)
      .single()

    // Update onboarding record
    const { data, error } = await supabase
      .from('user_onboarding')
      .update({
        current_phase: 'completed',
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error completing onboarding:', error)
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }

    // Calculate duration
    let durationSeconds = 0
    if (currentState?.created_at) {
      const startTime = new Date(currentState.created_at).getTime()
      const endTime = new Date().getTime()
      durationSeconds = Math.round((endTime - startTime) / 1000)
    }

    // Log the completion event
    await supabase
      .from('onboarding_events')
      .insert({
        user_id: userId,
        event_type: 'completed',
        phase: 'completed',
        metadata: {
          duration_seconds: durationSeconds,
          summary: summary || null,
          timestamp: new Date().toISOString()
        }
      })

    // Fetch summary data
    const [accountsResult, categoriesResult, budgetsResult] = await Promise.all([
      supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('budgets')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
    ])

    return NextResponse.json({
      success: true,
      onboarding: data as UserOnboardingDB,
      summary: {
        accountsCreated: accountsResult.data?.length || 0,
        categoriesCount: categoriesResult.data?.length || 0,
        budgetsCreated: budgetsResult.data?.length || 0,
        durationSeconds
      }
    })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
