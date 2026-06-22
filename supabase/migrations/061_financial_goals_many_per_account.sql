-- 061_financial_goals_many_per_account.sql
-- Goals revamp: an account may hold MULTIPLE goals (waterfall progress in code).
-- Drop the one-goal-per-account unique constraint added in 026.
ALTER TABLE financial_goals DROP CONSTRAINT IF EXISTS unique_account_goal;

-- Helpful index for the deadline-ordered waterfall + per-account listing.
CREATE INDEX IF NOT EXISTS idx_financial_goals_account_targetdate
  ON financial_goals(account_id, target_date);
