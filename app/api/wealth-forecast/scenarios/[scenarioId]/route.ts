import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ scenarioId: string }>
}

const ScenarioUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().optional(),
  horizon_years: z.number().int().min(1).max(60).optional(),
  expected_annual_return: z.number().min(-1).max(1).optional(),
  annual_volatility: z.number().min(0).max(1).optional(),
  inflation_rate: z.number().min(-1).max(1).optional(),
  monthly_contribution: z.number().optional(),
  monthly_withdrawal: z.number().optional(),
  include_cashflow: z.boolean().optional(),
  is_default: z.boolean().optional(),
  target_net_worth: z.number().min(0).optional(),
})

export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { scenarioId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = ScenarioUpdateSchema.parse(await request.json())

    if (body.is_default) {
      await supabase
        .from('wealth_forecast_scenarios')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', scenarioId)
    }

    const { data, error } = await supabase
      .from('wealth_forecast_scenarios')
      .update(body)
      .eq('id', scenarioId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
    }

    if (body.is_default) {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          forecast_default_scenario_id: data.id,
          updated_at: new Date().toISOString(),
        })
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
    const { scenarioId } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('wealth_forecast_scenarios')
      .delete()
      .eq('id', scenarioId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
