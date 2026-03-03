-- Migration: 035_backfill_onboarding_phase
--
-- Replaces deleted migrations 033 and 034.
-- Uses UPSERT so it handles both cases:
--   • user has no user_onboarding row (INSERT)
--   • user has a stale row with is_completed=false (UPDATE via ON CONFLICT)
--
-- Intentionally omits the is_active filter on accounts/budgets so that
-- any existing record counts — matching the behaviour of the API-level
-- reconciliation in GET /api/onboarding.

-- Pass 1: users with accounts + budgets → completed
INSERT INTO public.user_onboarding
  (user_id, current_phase, current_step, is_completed, is_skipped, completed_at, updated_at)
SELECT
  u.id,
  'completed',
  0,
  true,
  false,
  NOW(),
  NOW()
FROM auth.users u
WHERE
  EXISTS (SELECT 1 FROM public.accounts  a WHERE a.user_id = u.id)
  AND EXISTS (SELECT 1 FROM public.budgets   b WHERE b.user_id = u.id)
ON CONFLICT (user_id) DO UPDATE
  SET current_phase = 'completed',
      current_step  = 0,
      is_completed  = true,
      completed_at  = COALESCE(user_onboarding.completed_at, NOW()),
      updated_at    = NOW()
  WHERE user_onboarding.is_completed = false
    AND user_onboarding.is_skipped   = false;

-- Pass 2: users with accounts but no budget, stuck before budget_setup → advance
INSERT INTO public.user_onboarding
  (user_id, current_phase, current_step, is_completed, is_skipped, updated_at)
SELECT
  u.id,
  'budget_setup',
  0,
  false,
  false,
  NOW()
FROM auth.users u
WHERE
  EXISTS     (SELECT 1 FROM public.accounts a WHERE a.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.budgets  b WHERE b.user_id = u.id)
ON CONFLICT (user_id) DO UPDATE
  SET current_phase = 'budget_setup',
      current_step  = 0,
      updated_at    = NOW()
  WHERE user_onboarding.is_completed = false
    AND user_onboarding.is_skipped   = false
    AND user_onboarding.current_phase IN ('welcome', 'account_setup', 'categories');

-- Pass 3: users with no accounts at all and no row → insert at welcome
-- (these users genuinely need onboarding)
INSERT INTO public.user_onboarding
  (user_id, current_phase, current_step, is_completed, is_skipped, updated_at)
SELECT
  u.id,
  'welcome',
  0,
  false,
  false,
  NOW()
FROM auth.users u
WHERE
  NOT EXISTS (SELECT 1 FROM public.user_onboarding uo WHERE uo.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
