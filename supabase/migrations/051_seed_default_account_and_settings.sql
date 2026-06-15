-- Migration: extend handle_new_user() to also seed a hidden default account
-- and a user_settings row for every new auth.users row (including anonymous
-- users created during pre-account onboarding).
--
-- The default CASH account anchors the onboarding goal/plan and satisfies
-- downstream "an account exists" assumptions. The user_settings row gives the
-- user their settings record up-front using the table's column defaults.
--
-- This only replaces the function body — the existing on_auth_user_created
-- trigger already points at public.handle_new_user(), so re-defining the
-- function is sufficient. The body below is copied verbatim from migration
-- 046 with the two new inserts appended just before RETURN new.

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
  -- 5 expense categories (covers needs + wants in budget templates)
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Food & Dining',    'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Transportation',   'hsl(var(--chart-2))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Bills & Utilities','hsl(var(--chart-5))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Shopping',         'hsl(var(--chart-3))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Entertainment',    'hsl(var(--chart-4))', 'EXPENSE', expense_group_id, false);

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

  -- NEW: hidden default account (anchors goal/plan; satisfies downstream "account exists" assumptions)
  INSERT INTO public.accounts (user_id, name, type, currency, balance, is_default)
  VALUES (new.id, 'Cash', 'CASH', 'IDR', 0, true);

  -- NEW: user_settings row with column defaults
  INSERT INTO public.user_settings (user_id) VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles new user registration by creating profile, user role, default category groups, a minimal default category set (5 expense + 1 income + 1 transfer), onboarding record, initial onboarding event, a hidden default CASH account, and a user_settings row. Runs atomically within a single transaction.';
