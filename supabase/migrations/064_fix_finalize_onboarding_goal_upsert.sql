-- 064_fix_finalize_onboarding_goal_upsert.sql
-- Fix latent runtime bug: finalize_onboarding step 4 used
--   INSERT INTO financial_goals ... ON CONFLICT (account_id) DO UPDATE
-- but migration 061 dropped the unique(account_id) constraint (many goals per
-- account), so that branch threw "no unique or exclusion constraint matching the
-- ON CONFLICT specification" whenever a guest finalized onboarding WITH a goal.
-- Replaced with an explicit idempotent find-or-create keyed on (account_id, name).
--
-- ⚠️ NOTE: this version qualifies the PL/pgSQL variable as `finalize_onboarding.account_id`,
-- which Postgres parses as a table reference at runtime ("missing FROM-clause entry").
-- It is superseded by migration 065, which renames the colliding variables. Kept here
-- as the immutable applied-migration record; 065 is the working version.
CREATE OR REPLACE FUNCTION public.finalize_onboarding(p_user_id uuid, p_draft jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  transfer_group_id UUID;
  account_id UUID;
  plan_id UUID;
  goal_id UUID;
  alloc jsonb;
  cat_id UUID;
  total NUMERIC := 0;
  v_period TEXT := COALESCE(p_draft->>'period', 'monthly');
BEGIN
  -- ── 0. Caller guard (defense-in-depth) ────────────────────────────────────
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized to finalize onboarding for another user';
  END IF;

  -- ── 1. Ensure category groups (find-or-create by user_id + name) ──────────
  SELECT id INTO expense_group_id FROM public.category_groups
    WHERE user_id = p_user_id AND name = 'Expenses';
  IF expense_group_id IS NULL THEN
    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (p_user_id, 'Expenses', 'EXPENSE', '#EF4444', true, 1) RETURNING id INTO expense_group_id;
  END IF;

  SELECT id INTO income_group_id FROM public.category_groups
    WHERE user_id = p_user_id AND name = 'Income';
  IF income_group_id IS NULL THEN
    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (p_user_id, 'Income', 'INCOME', '#10B981', true, 2) RETURNING id INTO income_group_id;
  END IF;

  SELECT id INTO transfer_group_id FROM public.category_groups
    WHERE user_id = p_user_id AND name = 'Transfer';
  IF transfer_group_id IS NULL THEN
    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (p_user_id, 'Transfer', 'TRANSFER', '#6B7280', true, 3) RETURNING id INTO transfer_group_id;
  END IF;

  -- ── 2. Ensure core categories (idempotent) ────────────────────────────────
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  SELECT p_user_id, v.name, v.color, v.gtype, v.gid, false
  FROM (VALUES
    ('Housing & rent',        'hsl(var(--chart-3))', 'EXPENSE', expense_group_id),
    ('Food & groceries',      'hsl(var(--chart-1))', 'EXPENSE', expense_group_id),
    ('Transport',             'hsl(var(--chart-2))', 'EXPENSE', expense_group_id),
    ('Bills & subscriptions', 'hsl(var(--chart-5))', 'EXPENSE', expense_group_id),
    ('Lifestyle & fun',       'hsl(var(--chart-4))', 'EXPENSE', expense_group_id),
    ('Income',                'hsl(var(--success))', 'INCOME',  income_group_id),
    ('Savings transfer',      'hsl(var(--muted-foreground))', 'TRANSFER', transfer_group_id)
  ) AS v(name, color, gtype, gid)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = p_user_id AND c.name = v.name
  );

  -- ── 3. Ensure default Cash account ────────────────────────────────────────
  SELECT id INTO account_id FROM public.accounts
    WHERE user_id = p_user_id AND name = 'Cash' AND type = 'CASH';
  IF account_id IS NULL THEN
    INSERT INTO public.accounts (user_id, name, type, currency, balance, is_default)
    VALUES (p_user_id, 'Cash', 'CASH', 'IDR', 0, true) RETURNING id INTO account_id;
  END IF;

  -- ── 4. Goal (optional) — idempotent find-or-create by (account_id, name) ──
  IF p_draft ? 'goal' AND p_draft->'goal' IS NOT NULL AND jsonb_typeof(p_draft->'goal') = 'object' THEN
    SELECT fg.id INTO goal_id FROM public.financial_goals fg
      WHERE fg.account_id = finalize_onboarding.account_id
        AND fg.name = p_draft->'goal'->>'name';

    IF goal_id IS NULL THEN
      INSERT INTO public.financial_goals (account_id, goal_type, target_amount, target_date, name, status)
      VALUES (
        finalize_onboarding.account_id,
        p_draft->'goal'->>'goal_type',
        (p_draft->'goal'->>'target_amount')::numeric,
        (p_draft->'goal'->>'target_date')::date,
        p_draft->'goal'->>'name',
        'active'
      )
      RETURNING id INTO goal_id;
    ELSE
      UPDATE public.financial_goals fg
        SET goal_type = p_draft->'goal'->>'goal_type',
            target_amount = (p_draft->'goal'->>'target_amount')::numeric,
            target_date = (p_draft->'goal'->>'target_date')::date,
            status = 'active'
        WHERE fg.id = goal_id;
    END IF;
  END IF;

  -- ── 5. Budget plan + allocations (optional) ───────────────────────────────
  IF p_draft ? 'allocations' AND jsonb_typeof(p_draft->'allocations') = 'array' AND jsonb_array_length(p_draft->'allocations') > 0 THEN
    SELECT COALESCE(SUM((a->>'amount')::numeric), 0) INTO total
    FROM jsonb_array_elements(p_draft->'allocations') AS a;

    INSERT INTO public.budget_plans (user_id, period, total_amount)
    VALUES (p_user_id, v_period, total)
    ON CONFLICT (user_id, period) DO UPDATE SET total_amount = EXCLUDED.total_amount
    RETURNING id INTO plan_id;

    DELETE FROM public.budget_plan_categories bpc WHERE bpc.plan_id = finalize_onboarding.plan_id;

    FOR alloc IN SELECT * FROM jsonb_array_elements(p_draft->'allocations')
    LOOP
      -- find-or-create the category by name (custom extras land in Expenses)
      SELECT id INTO cat_id FROM public.categories
        WHERE user_id = p_user_id AND name = alloc->>'name';
      IF cat_id IS NULL THEN
        INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
        VALUES (p_user_id, alloc->>'name', 'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, true)
        RETURNING id INTO cat_id;
      END IF;

      INSERT INTO public.budget_plan_categories (plan_id, category_id, allocated_amount)
      VALUES (finalize_onboarding.plan_id, cat_id, (alloc->>'amount')::numeric);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('goal_id', goal_id, 'plan_id', plan_id, 'account_id', account_id);
END;
$function$;
