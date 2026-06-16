-- Migration: align the seeded default EXPENSE categories to the onboarding
-- design's category set so every onboarding spend screen renders real,
-- pre-seeded categories (no find-or-create, no duplicates).
--
-- This ONLY changes the 5 EXPENSE category names. The account + user_settings
-- inserts, category groups, Income (INCOME) and Savings transfer (TRANSFER)
-- categories, onboarding record/event, colors, group types and group ids are
-- all copied VERBATIM from migration 051. Savings transfer is referenced by
-- budget-template mappings and the onboarding budget plan — left unchanged.
--
-- Renames (EXPENSE only):
--   Food & Dining     -> Food & groceries
--   Transportation    -> Transport
--   Bills & Utilities -> Bills & subscriptions
--   Shopping          -> (replaced by) Housing & rent
--   Entertainment     -> Lifestyle & fun
-- Colors (hsl(var(--chart-N))) and group ids are kept on the same rows.
--
-- This only replaces the function body — the existing on_auth_user_created
-- trigger already points at public.handle_new_user(), so re-defining the
-- function is sufficient. Affects NEW signups only; existing users keep their
-- current categories.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  transfer_group_id UUID;
BEGIN
  -- Step 1: Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- Step 2: Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'));

  -- Step 3: Create default category groups
  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Expenses', 'EXPENSE', '#EF4444', true, 1)
  RETURNING id INTO expense_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Income', 'INCOME', '#10B981', true, 2)
  RETURNING id INTO income_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Transfer', 'TRANSFER', '#6B7280', true, 3)
  RETURNING id INTO transfer_group_id;

  -- Step 4: Create default categories — minimal starter set
  -- 5 expense categories aligned to the onboarding design's spend categories
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Housing & rent',        'hsl(var(--chart-3))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Food & groceries',      'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Transport',             'hsl(var(--chart-2))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Bills & subscriptions', 'hsl(var(--chart-5))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Lifestyle & fun',       'hsl(var(--chart-4))', 'EXPENSE', expense_group_id, false);

  -- 1 income category
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Income', 'hsl(var(--success))', 'INCOME', income_group_id, false);

  -- 1 transfer category — "Savings transfer" name matches budget template mappings
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Savings transfer', 'hsl(var(--muted-foreground))', 'TRANSFER', transfer_group_id, false);

  -- Step 5: Create onboarding record
  INSERT INTO public.user_onboarding (user_id, current_phase, current_step)
  VALUES (new.id, 'welcome', 0);

  -- Step 6: Log initial onboarding event
  INSERT INTO public.onboarding_events (user_id, event_type, phase, metadata)
  VALUES (new.id, 'phase_started', 'welcome', jsonb_build_object(
    'source', 'registration',
    'timestamp', NOW()
  ));

  -- default account (auto-created; no setup form — shown as the user's
  -- default wallet; anchors goal/plan; satisfies downstream "account exists" assumptions)
  INSERT INTO public.accounts (user_id, name, type, currency, balance, is_default)
  VALUES (new.id, 'Cash', 'CASH', 'IDR', 0, true)
  ON CONFLICT (user_id, name) DO NOTHING;

  -- user_settings row with column defaults
  INSERT INTO public.user_settings (user_id) VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles new user registration by creating profile, user role, default category groups, a minimal default category set (5 design-aligned expense + 1 income + 1 transfer), onboarding record, initial onboarding event, a default CASH account (shown as the user''s default wallet), and a user_settings row. Runs atomically within a single transaction.';

-- ============================================================================
-- Realign budget-template category mappings to the new seeded category names.
-- ============================================================================
-- budget_templates is a global (not per-user) table seeded once in migration
-- 024. seedFromTemplate (lib/budget-screen-utils.ts) matches these names
-- against each user's categories by exact name, so after the rename the old
-- names ("Food & Dining", …) would never match and the templates would seed
-- empty allocations. Remap each bucket to the design-aligned seeded names.
-- (The previous mappings also referenced Healthcare / Travel / Education, which
-- were never part of the seeded set and silently filtered out; dropped here.)

UPDATE public.budget_templates
SET category_mappings = '{"needs": ["Housing & rent", "Food & groceries", "Transport", "Bills & subscriptions"], "wants": ["Lifestyle & fun"], "savings": ["Savings transfer"]}'::jsonb
WHERE name IN ('50/30/20 Rule', 'Conservative Saver', 'Balanced Budget');

COMMENT ON COLUMN public.budget_templates.category_mappings IS
  'JSON object mapping allocation keys to category names, e.g., {"needs": ["Food & groceries", "Bills & subscriptions"]}';
