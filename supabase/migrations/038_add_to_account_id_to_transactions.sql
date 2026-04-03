-- Add to_account_id column for TRANSFER transactions.
-- When type = 'TRANSFER', account_id is the source (money out)
-- and to_account_id is the destination (money in).
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id
  ON transactions(to_account_id)
  WHERE to_account_id IS NOT NULL;

COMMENT ON COLUMN transactions.to_account_id
  IS 'Destination account for TRANSFER transactions. NULL for INCOME/EXPENSE.';
