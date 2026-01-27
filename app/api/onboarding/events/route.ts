import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import type { OnboardingEventDB, OnboardingEventInsert } from '@/types/database'

/**
 * GET /api/onboarding/events
 * Fetches onboarding events for a user (for analytics/debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    const { data, error } = await supabase
      .from('onboarding_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching onboarding events:', error)
      return NextResponse.json({ error: 'Failed to fetch onboarding events' }, { status: 500 })
    }

    return NextResponse.json(data as OnboardingEventDB[])
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/onboarding/events
 * Logs an onboarding event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventType, phase, step, metadata } = body

    if (!userId || !eventType) {
      return NextResponse.json({ error: 'User ID and event type are required' }, { status: 400 })
    }

    // Validate event type
    const validEventTypes = ['phase_started', 'phase_completed', 'step_completed', 'skipped', 'resumed', 'completed']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    const eventData: OnboardingEventInsert = {
      user_id: userId,
      event_type: eventType,
      phase: phase || null,
      step: step !== undefined ? step : null,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('onboarding_events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.error('Error logging onboarding event:', error)
      return NextResponse.json({ error: 'Failed to log onboarding event' }, { status: 500 })
    }

    return NextResponse.json(data as OnboardingEventDB, { status: 201 })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
