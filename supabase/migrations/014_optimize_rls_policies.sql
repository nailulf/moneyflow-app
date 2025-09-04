-- Migration to optimize RLS policies for better performance
-- This migration replaces auth.uid() with (SELECT auth.uid()) in RLS policies
-- to prevent re-evaluation for each row, improving query performance

-- Optimize RLS policies for budgets table
DROP POLICY IF EXISTS "Users can view their own budgets" ON budgets;
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own budgets" ON budgets;
CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own budgets" ON budgets;
CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own budgets" ON budgets;
CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Optimize RLS policies for budget_categories table
DROP POLICY IF EXISTS "Users can view their own budget categories" ON budget_categories;
CREATE POLICY "Users can view their own budget categories" ON budget_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own budget categories" ON budget_categories;
CREATE POLICY "Users can insert their own budget categories" ON budget_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own budget categories" ON budget_categories;
CREATE POLICY "Users can update their own budget categories" ON budget_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own budget categories" ON budget_categories;
CREATE POLICY "Users can delete their own budget categories" ON budget_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND budgets.user_id = (SELECT auth.uid())
    )
  );

-- Optimize RLS policies for categories table
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Optimize RLS policies for category_groups table
DROP POLICY IF EXISTS "Users can view their own category groups" ON category_groups;
CREATE POLICY "Users can view their own category groups" ON category_groups
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own category groups" ON category_groups;
CREATE POLICY "Users can insert their own category groups" ON category_groups
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own category groups" ON category_groups;
CREATE POLICY "Users can update their own category groups" ON category_groups
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own category groups" ON category_groups;
CREATE POLICY "Users can delete their own category groups" ON category_groups
  FOR DELETE USING ((SELECT auth.uid()) = user_id);