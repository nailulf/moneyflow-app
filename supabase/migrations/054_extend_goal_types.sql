-- Migration: Extend financial_goals.goal_type allowed values for the Phase 2 onboarding funnel
-- Allow the new goal types `debt_payoff` and `gadget` alongside the existing ones
-- (additive; nothing is removed).
--
-- The original constraint was created inline in migration 026 with no explicit name, so
-- Postgres auto-named it `financial_goals_goal_type_check`. We drop it by that name, and
-- additionally use a defensive DO block to drop any other CHECK constraint that references
-- goal_type, in case the auto-name differs across environments.

-- Defensively drop any CHECK constraint on financial_goals that references goal_type.
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
      AND t.relname = 'financial_goals'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%goal_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.financial_goals DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

-- Drop the known auto-named constraint if it still exists (no-op if already dropped above).
ALTER TABLE public.financial_goals
  DROP CONSTRAINT IF EXISTS financial_goals_goal_type_check;

ALTER TABLE public.financial_goals
  ADD CONSTRAINT financial_goals_goal_type_check
  CHECK (goal_type IN (
    'emergency_fund',
    'vacation',
    'house_down_payment',
    'car_purchase',
    'education',
    'wedding',
    'investment',
    'other',
    'debt_payoff',
    'gadget'
  ));

COMMENT ON COLUMN public.financial_goals.goal_type IS 'Goal type. Original (migration 026): emergency_fund, vacation, house_down_payment, car_purchase, education, wedding, investment, other. Phase 2 onboarding funnel (migration 054): debt_payoff, gadget.';
