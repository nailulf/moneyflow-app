-- Fix mutable search_path in get_transaction_stats function
-- This addresses a security concern where functions with mutable search_path
-- could potentially be vulnerable to SQL injection attacks

-- Drop the existing function
DROP FUNCTION IF EXISTS get_transaction_stats;

-- Recreate the function with SECURITY DEFINER and explicit search_path
CREATE OR REPLACE FUNCTION get_transaction_stats(
  user_uuid UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_income DECIMAL,
  total_expense DECIMAL,
  net_amount DECIMAL,
  transaction_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as total_expense,
    COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount WHEN t.type = 'EXPENSE' THEN -t.amount ELSE 0 END), 0) as net_amount,
    COUNT(*) as transaction_count
  FROM transactions t
  WHERE t.user_id = user_uuid
    AND (start_date IS NULL OR t.date >= start_date)
    AND (end_date IS NULL OR t.date <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the security improvements
COMMENT ON FUNCTION get_transaction_stats IS 'Returns transaction statistics for a user within a date range. Security definer with fixed search_path to prevent SQL injection.';