import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

const EventUpdateSchema = z.object({
  scenario_id: z.string().uuid().optional(),
  event_date: z.string().optional(),
  event_type: z.enum(['CONTRIBUTION', 'WITHDRAWAL', 'INCOME', 'EXPENSE', 'ADJUSTMENT']).optional(),
  amount: z.number().optional(),
  note: z.string().nullable().optional(),
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

    const { data, error } = await supabase
      .from('wealth_forecast_events')
      .update(body)
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
