import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import type { UserOnboardingDB } from '@/types/database'

/**
 * POST /api/onboarding/skip
 * Marks the onboarding as skipped for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // Update onboarding record
    const { data, error } = await supabase
      .from('user_onboarding')
      .update({
        is_skipped: true,
        skipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error skipping onboarding:', error)
      return NextResponse.json({ error: 'Failed to skip onboarding' }, { status: 500 })
    }

    // Log the skip event
    await supabase
      .from('onboarding_events')
      .insert({
        user_id: userId,
        event_type: 'skipped',
        phase: data.current_phase,
        step: data.current_step,
        metadata: {
          reason: reason || null,
          timestamp: new Date().toISOString()
        }
      })

    return NextResponse.json({
      success: true,
      onboarding: data as UserOnboardingDB
    })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
