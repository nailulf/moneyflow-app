-- Migration: Extend handle_new_user trigger to create onboarding records
-- This migration updates the existing handle_new_user() function to also
-- create user_onboarding records and log the initial onboarding event

-- Drop the existing trigger first (so we can recreate the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with onboarding record creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  transfer_group_id UUID;
BEGIN
  -- Step 1: Create profile (existing functionality)
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- Step 2: Create user role (existing functionality)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'));

  -- Step 3: Create default category groups (existing functionality)
  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Expenses', 'EXPENSE', '#EF4444', true, 1)
  RETURNING id INTO expense_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Income', 'INCOME', '#10B981', true, 2)
  RETURNING id INTO income_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (new.id, 'Transfer', 'TRANSFER', '#6B7280', true, 3)
  RETURNING id INTO transfer_group_id;

  -- Step 4: Create default categories (existing functionality)
  -- Expense categories (9 categories)
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Food & Dining', 'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Transportation', 'hsl(var(--chart-2))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Shopping', 'hsl(var(--chart-3))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Entertainment', 'hsl(var(--chart-4))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Bills & Utilities', 'hsl(var(--chart-5))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Healthcare', 'hsl(var(--primary))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Education', 'hsl(var(--secondary))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Travel', 'hsl(var(--accent))', 'EXPENSE', expense_group_id, false),
    (new.id, 'Other', 'hsl(var(--muted-foreground))', 'EXPENSE', expense_group_id, false);

  -- Income category (1 category)
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Income', 'hsl(var(--success))', 'INCOME', income_group_id, false);

  -- Transfer categories (3 categories)
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (new.id, 'Transfer', 'hsl(var(--muted))', 'TRANSFER', transfer_group_id, false),
    (new.id, 'Savings transfer', 'hsl(var(--muted-foreground))', 'TRANSFER', transfer_group_id, false),
    (new.id, 'Credit card payment', 'hsl(var(--destructive))', 'TRANSFER', transfer_group_id, false);

  -- Step 5: Create onboarding record (NEW)
  INSERT INTO public.user_onboarding (user_id, current_phase, current_step)
  VALUES (new.id, 'welcome', 0);

  -- Step 6: Log initial onboarding event (NEW)
  INSERT INTO public.onboarding_events (user_id, event_type, phase, metadata)
  VALUES (new.id, 'phase_started', 'welcome', jsonb_build_object(
    'source', 'registration',
    'timestamp', NOW()
  ));

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add updated comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles new user registration by creating profile, user role, default category groups, default categories, onboarding record, and initial onboarding event. Runs atomically within a single transaction.';
