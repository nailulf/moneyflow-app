-- Optimize RLS policies for transactions table by replacing auth.uid() with (SELECT auth.uid())
-- This prevents re-evaluation of auth.uid() for each row, improving query performance

-- Drop existing policy
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Recreate policy with optimized condition
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Also optimize other policies for consistency and performance
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);