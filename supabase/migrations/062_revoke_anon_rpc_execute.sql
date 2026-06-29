-- 062_revoke_anon_rpc_execute.sql
-- Security fix: revoke anon/authenticated EXECUTE on SECURITY DEFINER functions
-- that bypass RLS and were callable via /rest/v1/rpc with the public anon key.
--
-- Root cause: finalize_onboarding(uuid, jsonb) is SECURITY DEFINER, does NOT verify
-- auth.uid(), and inserts category_groups/accounts/budget_plans/financial_goals for
-- the p_user_id passed in. Anyone with the public anon key could call it to create
-- goals (and other rows) for ANY user, with no authentication.
--
-- Safe: the app calls finalize_onboarding only via the service-role client (which
-- retains EXECUTE); add_investment_asset is self-guarded (checks auth.uid()) and is
-- used by signed-in users, so it keeps `authenticated`; the remaining functions are
-- triggers/internal helpers not invoked via RPC (triggers don't need EXECUTE grants).
-- Fully reversible via GRANT.

-- Cross-tenant write: creates accounts/goals for any user_id (CRITICAL)
REVOKE EXECUTE ON FUNCTION public.finalize_onboarding(uuid, jsonb) FROM anon, authenticated;
-- Cross-tenant read of any user's financial summary (unused by app)
REVOKE EXECUTE ON FUNCTION public.get_transaction_stats(uuid, date, date) FROM anon, authenticated;
-- Write to arbitrary user's onboarding state (unused by app)
REVOKE EXECUTE ON FUNCTION public.backfill_onboarding_for_user(uuid) FROM anon, authenticated;

-- Internal trigger/helper functions — never meant to be called via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_goal_completion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_account_balance_from_holdings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_holding_fn() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_holding(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_account_unallocated_cash(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_budget_spent_amounts(uuid) FROM anon, authenticated;

-- Self-guarded (checks auth.uid()) and used by signed-in users → drop only anon
REVOKE EXECUTE ON FUNCTION public.add_investment_asset(uuid, uuid, text, text, text, text, numeric, numeric, date) FROM anon;
