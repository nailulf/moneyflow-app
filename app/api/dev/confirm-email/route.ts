import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { isDevToolsEnabled } from '@/lib/utils/environment'

export async function POST(request: NextRequest) {
  if (!isDevToolsEnabled()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and preview environments' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createServerComponentClient()
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()

    if (usersError || !usersData?.users) {
      return NextResponse.json({ error: 'User lookup failed' }, { status: 500 })
    }

    const user = usersData.users.find((candidate) => candidate.email === email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
