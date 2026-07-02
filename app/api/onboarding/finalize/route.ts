import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServerComponentClient } from '@/lib/supabase'

const DraftSchema = z.object({
  goal: z
    .object({
      goal_type: z.enum([
        'emergency_fund',
        'vacation',
        'house_down_payment',
        'car_purchase',
        'education',
        'wedding',
        'investment',
        'other',
        'debt_payoff',
        'gadget',
      ]),
      name: z.string().max(120),
      target_amount: z.number().positive().max(1e15),
      target_date: z.string().date(),
    })
    .optional(),
  allocations: z
    .array(z.object({ name: z.string().min(1).max(120), amount: z.number().min(0).max(1e15) }))
    .max(100),
  period: z.enum(['monthly', 'yearly']).default('monthly'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = DraftSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 422 })
  }

  const admin = createServerComponentClient()
  const { data, error } = await admin.rpc('finalize_onboarding', {
    p_user_id: user.id,
    p_draft: parsed.data,
  })
  if (error) {
    console.error('[Onboarding Finalize] finalize_onboarding failed:', error)
    return NextResponse.json({ error: 'Failed to finalize onboarding' }, { status: 500 })
  }
  return NextResponse.json(data)
}
