import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import type { UserOnboardingDB, UserOnboardingUpdate } from '@/types/database'

/**
 * GET /api/onboarding
 * Fetches the onboarding state for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    const { data, error } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no record found, this might be an existing user before onboarding was implemented
      if (error.code === 'PGRST116') {
        return NextResponse.json(null)
      }
      console.error('Error fetching onboarding state:', error)
      return NextResponse.json({ error: 'Failed to fetch onboarding state' }, { status: 500 })
    }

    return NextResponse.json(data as UserOnboardingDB)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/onboarding
 * Updates the onboarding state for a user
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body as { userId: string } & UserOnboardingUpdate

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // Build update object, only including provided fields
    const updateData: UserOnboardingUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating onboarding state:', error)
      return NextResponse.json({ error: 'Failed to update onboarding state' }, { status: 500 })
    }

    return NextResponse.json(data as UserOnboardingDB)
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/onboarding
 * Creates an onboarding record for a user (mainly for testing/admin purposes)
 * Normally this is created by the database trigger on user registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    // Check if record already exists
    const { data: existing } = await supabase
      .from('user_onboarding')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Onboarding record already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('user_onboarding')
      .insert({
        user_id: userId,
        current_phase: 'welcome',
        current_step: 0,
        is_completed: false,
        is_skipped: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating onboarding record:', error)
      return NextResponse.json({ error: 'Failed to create onboarding record' }, { status: 500 })
    }

    return NextResponse.json(data as UserOnboardingDB, { status: 201 })
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
