import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { createClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '../../lib/supabase'

const hasEnv = !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL
const d = hasEnv ? describe : describe.skip

d('handle_new_user seeds account + settings', () => {
  // The describe body is evaluated even when skipped (to register the suite),
  // so only construct the service-role client when env is present —
  // createServerComponentClient() throws without env vars.
  const admin = hasEnv ? createServerComponentClient() : (null as never)
  let userId: string

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId)
  })

  it('seeds exactly one default account, 7 categories, and a user_settings row', async () => {
    const email = `test-seed-${crypto.randomUUID()}@example.com`
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    expect(error).toBeNull()
    userId = data.user!.id

    const accounts = await admin.from('accounts').select('*').eq('user_id', userId)
    expect(accounts.data).toHaveLength(1)
    expect(accounts.data![0].is_default).toBe(true)
    expect(accounts.data![0].type).toBe('CASH')

    const categories = await admin.from('categories').select('id').eq('user_id', userId)
    expect(categories.data).toHaveLength(7)

    const settings = await admin.from('user_settings').select('*').eq('user_id', userId)
    expect(settings.data).toHaveLength(1)
  })
})

d('anonymous users cannot write directly', () => {
  it('rejects a direct transaction insert from an anonymous session', async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: session, error: signErr } = await anon.auth.signInAnonymously()
    expect(signErr).toBeNull()
    const uid = session.user!.id

    const account = await anon.from('accounts').select('id').eq('user_id', uid).single()
    const insert = await anon.from('transactions').insert({
      user_id: uid, account_id: account.data!.id, type: 'EXPENSE', amount: 1000,
      description: 'should fail', date: '2026-06-15', category_id: null,
    } as never)
    expect(insert.error).not.toBeNull()

    const { createServerComponentClient } = await import('../../lib/supabase')
    await createServerComponentClient().auth.admin.deleteUser(uid)
  })
})
