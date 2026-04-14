import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingEventDB, OnboardingEventInsert } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paramUserId = searchParams.get('userId')
    if (paramUserId && paramUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const { data, error } = await supabase
      .from('onboarding_events')
      .select('*')
      .eq('user_id', user.id)
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId: bodyUserId, eventType, phase, step, metadata } = body

    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!eventType) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 })
    }

    const validEventTypes = ['phase_started', 'phase_completed', 'step_completed', 'skipped', 'resumed', 'completed']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const eventData: OnboardingEventInsert = {
      user_id: user.id,
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
