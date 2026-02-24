-- Migration: 028_create_account_balance_adjustments
-- Purpose: Immutable audit log for manual account balance adjustments.
-- When a user manually sets their account balance, the previous and new values
-- are recorded here for transparency. The log cannot be modified or deleted.

CREATE TABLE IF NOT EXISTS account_balance_adjustments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_balance  DECIMAL(15, 2) NOT NULL,   -- computed balance before adjustment
  new_balance       DECIMAL(15, 2) NOT NULL,   -- declared balance after adjustment
  adjustment_amount DECIMAL(15, 2) NOT NULL,   -- new_balance - previous_balance
  note              TEXT,
  adjustment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adjustments"
  ON account_balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adjustments"
  ON account_balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies — log entries are immutable

CREATE INDEX idx_balance_adj_account
  ON account_balance_adjustments(account_id);

CREATE INDEX idx_balance_adj_date
  ON account_balance_adjustments(adjustment_date DESC);
