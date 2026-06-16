-- Migration: Extend user_onboarding.current_phase allowed values for the guest funnel
-- Allow the new guest-funnel phases alongside the legacy ones (additive; nothing is removed).
--
-- The original constraint was created inline in migration 024 with no explicit name, so
-- Postgres auto-named it `user_onboarding_current_phase_check`. We drop it by that name, and
-- additionally use a defensive DO block to drop any other CHECK constraint that references
-- current_phase, in case the auto-name differs across environments.

-- Defensively drop any CHECK constraint on user_onboarding that references current_phase.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_onboarding'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%current_phase%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_onboarding DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

-- Drop the known auto-named constraint if it still exists (no-op if already dropped above).
ALTER TABLE public.user_onboarding
  DROP CONSTRAINT IF EXISTS user_onboarding_current_phase_check;

ALTER TABLE public.user_onboarding
  ADD CONSTRAINT user_onboarding_current_phase_check
  CHECK (current_phase IN (
    'welcome', 'account_setup', 'categories', 'budget_setup', 'completed',
    'intent', 'goal_setup', 'health_check', 'plan', 'conversion'
  ));

COMMENT ON COLUMN public.user_onboarding.current_phase IS 'Current phase of onboarding. Legacy: welcome, account_setup, categories, budget_setup, completed. Guest funnel: intent, goal_setup, health_check, plan, conversion.';
