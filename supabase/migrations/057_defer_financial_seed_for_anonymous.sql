-- supabase/migrations/057_defer_financial_seed_for_anonymous.sql
--
-- Defer financial seeding for ANONYMOUS users. Anonymous guests in the
-- onboarding funnel must not get category groups, categories, or an account
-- written to the DB — those are materialized at registration by
-- finalize_onboarding() (migration 058). Direct (non-anonymous) signups keep
-- the full seed from migration 056.
--
-- Only the function body changes; the on_auth_user_created trigger already
-- points at public.handle_new_user().

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  transfer_group_id UUID;
BEGIN
  -- Always-seeded, non-financial infrastructure (both anon and permanent).
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'));

  INSERT INTO public.user_onboarding (user_id, current_phase, current_step)
  VALUES (new.id, 'welcome', 0);

  INSERT INTO public.onboarding_events (user_id, event_type, phase, metadata)
  VALUES (new.id, 'phase_started', 'welcome', jsonb_build_object(
    'source', 'registration', 'timestamp', NOW()
  ));

  INSERT INTO public.user_settings (user_id) VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Financial seed: ONLY for permanent (non-anonymous) signups. Anonymous
  -- guests get these at registration via finalize_onboarding().
  IF COALESCE(new.is_anonymous, false) = false THEN
    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (new.id, 'Expenses', 'EXPENSE', '#EF4444', true, 1)
    RETURNING id INTO expense_group_id;

    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (new.id, 'Income', 'INCOME', '#10B981', true, 2)
    RETURNING id INTO income_group_id;

    INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
    VALUES (new.id, 'Transfer', 'TRANSFER', '#6B7280', true, 3)
    RETURNING id INTO transfer_group_id;

    INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
    VALUES
      (new.id, 'Housing & rent',        'hsl(var(--chart-3))', 'EXPENSE', expense_group_id, false),
      (new.id, 'Food & groceries',      'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, false),
      (new.id, 'Transport',             'hsl(var(--chart-2))', 'EXPENSE', expense_group_id, false),
      (new.id, 'Bills & subscriptions', 'hsl(var(--chart-5))', 'EXPENSE', expense_group_id, false),
      (new.id, 'Lifestyle & fun',       'hsl(var(--chart-4))', 'EXPENSE', expense_group_id, false);

    INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
    VALUES (new.id, 'Income', 'hsl(var(--success))', 'INCOME', income_group_id, false);

    INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
    VALUES (new.id, 'Savings transfer', 'hsl(var(--muted-foreground))', 'TRANSFER', transfer_group_id, false);

    INSERT INTO public.accounts (user_id, name, type, currency, balance, is_default)
    VALUES (new.id, 'Cash', 'CASH', 'IDR', 0, true)
    ON CONFLICT (user_id, name) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS
  'New-user seed. Always: profile, role, onboarding record/event, user_settings. Financial defaults (category groups, categories, Cash account) only for non-anonymous signups; anonymous guests get them at registration via finalize_onboarding().';
