import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserOnboardingDB } from '@/types/database'

/**
 * POST /api/onboarding/skip
 * Marks the onboarding as skipped for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId: bodyUserId, reason } = body
    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

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
