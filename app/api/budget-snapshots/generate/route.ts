import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { generateBudgetSnapshots } from '@/lib/budget-snapshot-processor'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
