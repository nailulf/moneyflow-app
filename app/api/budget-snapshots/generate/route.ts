import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { generateBudgetSnapshots } from '@/lib/budget-snapshot-processor'
import { checkCronAuth } from '@/lib/cron-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret — constant-time
    const authError = checkCronAuth(request)
    if (authError) return authError

    const supabase = createServerComponentClient()
    const result = await generateBudgetSnapshots(supabase)

    return NextResponse.json({
      message: 'Budget snapshots generated',
      ...result,
    })
  } catch (error) {
    console.error('Snapshot generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
