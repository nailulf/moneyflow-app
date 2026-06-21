-- Unallocated (uninvested) cash held inside an INVESTMENT account: sell proceeds the user keeps as
-- available balance instead of recording an external transfer. Ledger-derived from SELLs flagged
-- proceeds_to_cash. Replaces SP1's external-cash mechanism (cash_account_id + source_investment_txn_id).

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS unallocated_cash DECIMAL(20,2) NOT NULL DEFAULT 0;

ALTER TABLE investment_transactions
  ADD COLUMN IF NOT EXISTS proceeds_to_cash BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE investment_transactions DROP COLUMN IF EXISTS cash_account_id;

-- Remove the obsolete external-cash linkage (no UI ever used it).
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_investment_txn_fk;
DROP INDEX IF EXISTS idx_txn_source_invtxn;
ALTER TABLE transactions DROP COLUMN IF EXISTS source_investment_txn_id;

-- Recompute an account's unallocated cash from its ledger.
CREATE OR REPLACE FUNCTION recompute_account_unallocated_cash(p_account_id UUID)
RETURNS VOID
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE accounts
  SET unallocated_cash = COALESCE(
        (SELECT SUM(total_amount) FROM investment_transactions
         WHERE account_id = p_account_id AND type = 'SELL' AND proceeds_to_cash),
        0),
      updated_at = NOW()
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql;

-- INVESTMENT account balance = holdings book value + unallocated cash.
CREATE OR REPLACE FUNCTION sync_account_balance_from_holdings()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  affected_account UUID := COALESCE(NEW.account_id, OLD.account_id);
BEGIN
  UPDATE accounts
  SET balance = COALESCE((SELECT SUM(current_value) FROM portfolio_holdings WHERE account_id = affected_account), 0)
              + COALESCE((SELECT unallocated_cash FROM accounts WHERE id = affected_account), 0),
      updated_at = NOW()
  WHERE id = affected_account;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- A ledger change updates the account's unallocated cash AND the holding aggregate. Recompute the
-- unallocated cash FIRST so the balance sync (fired by recompute_holding's UPDATE of current_value)
-- reads the fresh value.
CREATE OR REPLACE FUNCTION trg_recompute_holding_fn()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM recompute_account_unallocated_cash(COALESCE(NEW.account_id, OLD.account_id));
  PERFORM recompute_holding(COALESCE(NEW.holding_id, OLD.holding_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN accounts.unallocated_cash IS 'INVESTMENT only: uninvested cash from sells kept in-account; balance = SUM(holdings.current_value) + unallocated_cash';
