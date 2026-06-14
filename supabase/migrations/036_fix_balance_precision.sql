-- Migration: 036_fix_balance_precision
-- Purpose: Widen balance/amount columns from DECIMAL(12,2) to DECIMAL(20,2).
--
-- DECIMAL(12,2) only allows 10 digits before the decimal point, capping values
-- at 9,999,999,999.99. For IDR accounts this is easily exceeded (e.g. a savings
-- account of Rp 10,000,000,000 = 10 billion already overflows). DECIMAL(20,2)
-- allows 18 digits before the decimal (max ~999 quadrillion), covering any
-- practical real-world amount in any currency.
--
-- NOTE: trigger_check_goal_completion (from migration 026) uses
-- "AFTER UPDATE OF balance ON accounts", which blocks ALTER COLUMN TYPE in
-- PostgreSQL. We drop it, widen the column, then recreate it identically.

-- 1. Drop the trigger that references accounts.balance
DROP TRIGGER IF EXISTS trigger_check_goal_completion ON accounts;

-- 2. Widen the columns
ALTER TABLE accounts
  ALTER COLUMN balance TYPE DECIMAL(20, 2);

ALTER TABLE transactions
  ALTER COLUMN amount TYPE DECIMAL(20, 2);

-- 3. Recreate the trigger (identical to migration 026)
CREATE TRIGGER trigger_check_goal_completion
  AFTER UPDATE OF balance ON accounts
  FOR EACH ROW
  WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
  EXECUTE FUNCTION check_goal_completion();
