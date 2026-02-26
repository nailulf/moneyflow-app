import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ScenarioSchema = z.object({
  name: z.string().min(1),
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
})

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('wealth_forecast_scenarios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 })
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

    const body = ScenarioSchema.parse(await request.json())

    const { data: existingDefault } = await supabase
      .from('wealth_forecast_scenarios')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    const shouldBeDefault = body.is_default ?? !existingDefault

    const { data: scenario, error } = await supabase
      .from('wealth_forecast_scenarios')
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description ?? null,
        start_date: body.start_date,
        horizon_years: body.horizon_years,
        expected_annual_return: body.expected_annual_return,
        annual_volatility: body.annual_volatility,
        inflation_rate: body.inflation_rate,
        monthly_contribution: body.monthly_contribution,
        monthly_withdrawal: body.monthly_withdrawal,
        include_cashflow: body.include_cashflow,
        is_default: shouldBeDefault,
      })
      .select('*')
      .single()

    if (error || !scenario) {
      return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
    }

    if (shouldBeDefault) {
      await supabase
        .from('wealth_forecast_scenarios')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', scenario.id)

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          forecast_default_scenario_id: scenario.id,
          updated_at: new Date().toISOString(),
        })
    }

    return NextResponse.json(scenario)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
