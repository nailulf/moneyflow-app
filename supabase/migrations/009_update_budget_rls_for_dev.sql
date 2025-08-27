-- Update RLS policies for budget tables to work with development environment
-- This allows the test user to access budget data without authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON budgets;

DROP POLICY IF EXISTS "Users can view their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can insert their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can update their own budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Users can delete their own budget categories" ON budget_categories;

-- Create new policies that work with both authenticated users and test user
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (
    auth.uid() = user_id OR 
    user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
  );

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
  );

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
  );

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (
    auth.uid() = user_id OR 
    user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
  );

-- Create RLS policies for budget_categories
CREATE POLICY "Users can view their own budget categories" ON budget_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND (
        budgets.user_id = auth.uid() OR
        budgets.user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
      )
    )
  );

CREATE POLICY "Users can insert their own budget categories" ON budget_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND (
        budgets.user_id = auth.uid() OR
        budgets.user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
      )
    )
  );

CREATE POLICY "Users can update their own budget categories" ON budget_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND (
        budgets.user_id = auth.uid() OR
        budgets.user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
      )
    )
  );

CREATE POLICY "Users can delete their own budget categories" ON budget_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_categories.budget_id 
      AND (
        budgets.user_id = auth.uid() OR
        budgets.user_id = '845af89b-104f-4144-8335-bba4eabeb300'::uuid
      )
    )
  );

-- Add comment to document the development exception
COMMENT ON TABLE budgets IS 'Budget table with RLS policies that allow access for test user 845af89b-104f-4144-8335-bba4eabeb300 in development';
COMMENT ON TABLE budget_categories IS 'Budget categories table with RLS policies that allow access for test user 845af89b-104f-4144-8335-bba4eabeb300 in development';