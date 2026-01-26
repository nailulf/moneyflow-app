-- Migration: Add default category groups and categories creation to handle_new_user trigger
-- This migration extends the existing handle_new_user() function to automatically
-- create default category groups and categories when a new user registers.

-- Drop the existing trigger first (so we can recreate the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with default categories
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

  -- Step 4: Create default categories
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

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS
  'Handles new user registration by creating profile, user role, default category groups, and default categories. Runs atomically within a single transaction.';

-- ============================================================================
-- Backfill for existing users
-- ============================================================================

-- Create a function for backfilling (can be called manually if needed)
CREATE OR REPLACE FUNCTION public.backfill_default_categories_for_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  transfer_group_id UUID;
  existing_groups_count INTEGER;
BEGIN
  -- Check if user already has category groups
  SELECT COUNT(*) INTO existing_groups_count
  FROM public.category_groups
  WHERE user_id = target_user_id;

  -- Skip if user already has categories
  IF existing_groups_count > 0 THEN
    RETURN;
  END IF;

  -- Create default category groups
  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (target_user_id, 'Expenses', 'EXPENSE', '#EF4444', true, 1)
  RETURNING id INTO expense_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (target_user_id, 'Income', 'INCOME', '#10B981', true, 2)
  RETURNING id INTO income_group_id;

  INSERT INTO public.category_groups (user_id, name, type, color, is_default, sort_order)
  VALUES (target_user_id, 'Transfer', 'TRANSFER', '#6B7280', true, 3)
  RETURNING id INTO transfer_group_id;

  -- Create default expense categories
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (target_user_id, 'Food & Dining', 'hsl(var(--chart-1))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Transportation', 'hsl(var(--chart-2))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Shopping', 'hsl(var(--chart-3))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Entertainment', 'hsl(var(--chart-4))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Bills & Utilities', 'hsl(var(--chart-5))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Healthcare', 'hsl(var(--primary))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Education', 'hsl(var(--secondary))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Travel', 'hsl(var(--accent))', 'EXPENSE', expense_group_id, false),
    (target_user_id, 'Other', 'hsl(var(--muted-foreground))', 'EXPENSE', expense_group_id, false);

  -- Create default income category
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (target_user_id, 'Income', 'hsl(var(--success))', 'INCOME', income_group_id, false);

  -- Create default transfer categories
  INSERT INTO public.categories (user_id, name, color, group_type, category_group_id, is_custom)
  VALUES
    (target_user_id, 'Transfer', 'hsl(var(--muted))', 'TRANSFER', transfer_group_id, false),
    (target_user_id, 'Savings transfer', 'hsl(var(--muted-foreground))', 'TRANSFER', transfer_group_id, false),
    (target_user_id, 'Credit card payment', 'hsl(var(--destructive))', 'TRANSFER', transfer_group_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comment on the backfill function
COMMENT ON FUNCTION public.backfill_default_categories_for_user(UUID) IS
  'Backfills default category groups and categories for a user who does not have any. Safe to call multiple times - will skip if categories already exist.';

-- Backfill all existing users without category groups
DO $$
DECLARE
  user_record RECORD;
  backfill_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT DISTINCT p.id as user_id
    FROM public.profiles p
    LEFT JOIN public.category_groups cg ON p.id = cg.user_id
    WHERE cg.id IS NULL
  LOOP
    PERFORM public.backfill_default_categories_for_user(user_record.user_id);
    backfill_count := backfill_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled default categories for % users', backfill_count;
END $$;
