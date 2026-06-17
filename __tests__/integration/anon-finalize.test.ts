/** @jest-environment node */
/**
 * Integration test: anonymous seed + finalize_onboarding RPC.
 *
 * REQUIRES:
 *  - Migrations 057 + 058 deployed to Supabase (anon-aware trigger + finalize RPC).
 *  - `.env.local` with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.
 *
 * Run with:
 *   SUPABASE_INTEGRATION=1 npx jest __tests__/integration/anon-finalize.test.ts
 *
 * Skipped in the normal test suite unless SUPABASE_INTEGRATION=1 is set.
 */

import { createClient } from '@supabase/supabase-js'

const RUN = process.env.SUPABASE_INTEGRATION === '1'

;(RUN ? describe : describe.skip)('anonymous seed + finalize', () => {
  it('anon user gets NO categories/account until finalize, then exactly the core set', async () => {
    // Clients are created inside the test so that missing env vars only error
    // when the test actually runs (i.e. SUPABASE_INTEGRATION=1 is set).
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Create an anonymous user via signInAnonymously from a fresh client.
    // (auth.admin.createUser does NOT set is_anonymous, so the anon-aware
    //  trigger would not skip seeding on that path.)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: signedIn, error: signInError } = await anonClient.auth.signInAnonymously()
    expect(signInError).toBeNull()
    const userId = signedIn!.user!.id

    try {
      // Before finalize: no categories should exist for this anon user
      const before = await admin.from('categories').select('id').eq('user_id', userId)
      expect(before.data).toHaveLength(0)

      // Call finalize_onboarding RPC with a minimal draft
      const { error: finalizeError } = await admin.rpc('finalize_onboarding', {
        p_user_id: userId,
        p_draft: {
          goal: {
            goal_type: 'emergency_fund',
            name: 'Emergency Fund',
            target_amount: 30000000,
            target_date: '2026-12-17',
          },
          allocations: [
            { name: 'Housing & rent', amount: 3000000 },
            { name: 'Savings transfer', amount: 1000000 },
          ],
          period: 'monthly',
        },
      })
      expect(finalizeError).toBeNull()

      // After finalize: exactly the 7 canonical category names
      const after = await admin.from('categories').select('name').eq('user_id', userId)
      expect(after.error).toBeNull()
      expect(after.data!.map((c: { name: string }) => c.name).sort()).toEqual([
        'Bills & subscriptions',
        'Food & groceries',
        'Housing & rent',
        'Income',
        'Lifestyle & fun',
        'Savings transfer',
        'Transport',
      ])

      // Idempotent: calling finalize again stays at 7 categories
      await admin.rpc('finalize_onboarding', {
        p_user_id: userId,
        p_draft: { allocations: [], period: 'monthly' },
      })
      const again = await admin.from('categories').select('id').eq('user_id', userId)
      expect(again.data).toHaveLength(7)
    } finally {
      // Clean up test user
      await admin.auth.admin.deleteUser(userId)
    }
  }, 30_000)
})
