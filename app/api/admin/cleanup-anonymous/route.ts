import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

const MAX_AGE_DAYS = 30

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServerComponentClient()
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  let page = 1
  let deleted = 0
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const users = data.users
    for (const u of users) {
      if ((u as { is_anonymous?: boolean }).is_anonymous && new Date(u.created_at).getTime() < cutoff) {
        await admin.auth.admin.deleteUser(u.id)
        deleted++
      }
    }
    if (users.length < 200) break
    page++
  }
  return NextResponse.json({ success: true, deleted })
}
