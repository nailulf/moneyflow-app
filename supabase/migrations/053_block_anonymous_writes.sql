-- supabase/migrations/053_block_anonymous_writes.sql
-- Deny INSERT/UPDATE/DELETE for anonymous users on all user-owned tables.
-- SELECT is intentionally NOT restricted (guest homepage reads own rows).
-- Service-role endpoints and SECURITY DEFINER triggers bypass RLS, so the funnel still writes.
--
-- These are RESTRICTIVE policies: they are AND-ed with the existing permissive
-- (auth.uid() = user_id) policies, adding an `is_anonymous IS NOT TRUE` gate on writes.
-- Excluded by design (not user-mutable, so no anon write surface to block):
--   audit_logs, user_roles (SELECT/INSERT-only), budget_templates (global read-only),
--   exchange_rate_snapshots (system/cron, no user_id). user_preferences was dropped in 030.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'accounts','transactions','categories','category_groups',
    'budgets','budget_categories','budget_plans','budget_plan_categories',
    'budget_snapshots','budget_snapshot_categories','financial_goals',
    'statements','portfolio_holdings','account_balance_adjustments',
    'wealth_forecast_scenarios','wealth_forecast_events',
    'user_settings','user_onboarding','onboarding_events','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "block_anon_insert" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "block_anon_update" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "block_anon_delete" ON public.%I;', t);

    EXECUTE format($f$
      CREATE POLICY "block_anon_insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "block_anon_update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated
      USING ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE)
      WITH CHECK ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "block_anon_delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated
      USING ((auth.jwt()->>'is_anonymous')::boolean IS NOT TRUE);
    $f$, t);
  END LOOP;
END $$;
