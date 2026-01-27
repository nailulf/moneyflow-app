import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import type { BudgetTemplateDB } from '@/types/database'

/**
 * GET /api/budget-templates
 * Fetches all active budget templates
 */
export async function GET(request: NextRequest) {
  try {
    // Check if we're in build time
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Environment variables not configured' }, { status: 500 })
    }

    const supabase = createServerComponentClient()

    const { data, error } = await supabase
      .from('budget_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching budget templates:', error)
      return NextResponse.json({ error: 'Failed to fetch budget templates' }, { status: 500 })
    }

    return NextResponse.json(data as BudgetTemplateDB[])
  } catch (error: unknown) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
