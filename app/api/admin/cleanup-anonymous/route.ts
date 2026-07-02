import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { checkCronAuth } from '@/lib/cron-auth'

const MAX_AGE_DAYS = 30

export async function POST(request: Request) {
  const authError = checkCronAuth(request)
  if (authError) return authError

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
