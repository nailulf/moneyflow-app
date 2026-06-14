import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

const EventUpdateSchema = z.object({
  scenario_id: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  event_date: z.string().optional(),
  event_type: z.enum(['WEDDING', 'KIDS', 'EDUCATION', 'PROPERTY', 'HAJJ', 'VEHICLE', 'RETIREMENT', 'OTHER']).optional(),
  amount: z.number().nonnegative().optional(),
  note: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  is_enabled: z.boolean().optional(),
})

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { eventId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = EventUpdateSchema.parse(await request.json())

    if (body.scenario_id) {
      const { data: scenario, error: scenarioError } = await supabase
        .from('wealth_forecast_scenarios')
        .select('id')
        .eq('id', body.scenario_id)
        .eq('user_id', user.id)
        .single()

      if (scenarioError || !scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }
    }

    // Build update payload — only include fields that were actually provided
    const updatePayload: Record<string, unknown> = {}
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.event_date !== undefined) updatePayload.event_date = body.event_date
    if (body.event_type !== undefined) updatePayload.event_type = body.event_type
    if (body.amount !== undefined) updatePayload.amount = body.amount
    if (body.note !== undefined) updatePayload.note = body.note
    if (body.scenario_id !== undefined) updatePayload.scenario_id = body.scenario_id
    if (body.details !== undefined) updatePayload.details = body.details
    if (body.is_enabled !== undefined) updatePayload.is_enabled = body.is_enabled

    const { data, error } = await supabase
      .from('wealth_forecast_events')
      .update(updatePayload)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, context: RouteParams) {
  try {
    const { eventId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('wealth_forecast_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
