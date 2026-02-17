import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { isOnboardingResetEnabled } from '@/lib/utils/environment'

export async function POST(request: NextRequest) {
  // Only allow in development/preview environments
  if (!isOnboardingResetEnabled()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and preview environments' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerComponentClient()

    // Reset onboarding state
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: userId,
        current_phase: 'welcome',
        current_step: 0,
        is_completed: false,
        is_skipped: false,
        completed_at: null,
        skipped_at: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (onboardingError) {
      console.error('Error resetting onboarding:', onboardingError)
      return NextResponse.json(
        { error: 'Failed to reset onboarding state' },
        { status: 500 }
      )
    }

    // Clear onboarding events
    const { error: eventsError } = await supabase
      .from('onboarding_events')
      .delete()
      .eq('user_id', userId)

    if (eventsError) {
      console.warn('Could not clear onboarding events:', eventsError.message)
    }

    // Optional: Clean up test data (accounts, budgets)
    const cleanup = body.cleanup !== false // default to true
    
    if (cleanup) {
      // Delete accounts
      const { error: accountsError } = await supabase
        .from('accounts')
        .delete()
        .eq('user_id', userId)

      if (accountsError) {
        console.warn('Could not delete accounts:', accountsError.message)
      }

      // Delete budgets
      const { error: budgetsError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', userId)

      if (budgetsError) {
        console.warn('Could not delete budgets:', budgetsError.message)
      }
    }

    return NextResponse.json({
      success: true,
      onboarding: onboardingData,
      cleanupPerformed: cleanup
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}