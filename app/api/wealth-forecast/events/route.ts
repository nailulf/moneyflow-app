import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EventSchema = z.object({
  scenario_id: z.string().uuid(),
  name: z.string().min(1),
  event_date: z.string(),
  event_type: z.enum(['WEDDING', 'KIDS', 'EDUCATION', 'PROPERTY', 'HAJJ', 'VEHICLE', 'RETIREMENT', 'OTHER']),
  amount: z.number().nonnegative(),
  note: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional().default({}),
  is_enabled: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('scenarioId')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('wealth_forecast_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true })

    if (scenarioId) {
      query = query.eq('scenario_id', scenarioId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
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

    const body = EventSchema.parse(await request.json())

    const { data: scenario, error: scenarioError } = await supabase
      .from('wealth_forecast_scenarios')
      .select('id')
      .eq('id', body.scenario_id)
      .eq('user_id', user.id)
      .single()

    if (scenarioError || !scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      scenario_id: body.scenario_id,
      name: body.name,
      event_date: body.event_date,
      event_type: body.event_type,
      amount: body.amount,
      note: body.note ?? null,
    }
    // Include new columns only if provided (backward-compatible with pre-044 DBs)
    if (body.details && Object.keys(body.details).length > 0) insertPayload.details = body.details
    if (body.is_enabled !== undefined && body.is_enabled !== true) insertPayload.is_enabled = body.is_enabled

    const { data: event, error } = await supabase
      .from('wealth_forecast_events')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
