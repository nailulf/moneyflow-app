-- Portfolio holdings: per-asset positions inside an INVESTMENT account.
-- A holding's value is user-entered (no market-price feed); the parent
-- account's balance is kept as the SUM of its holdings' current_value by trigger.

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class     TEXT NOT NULL CHECK (asset_class IN
                    ('IDX_STOCK', 'US_STOCK', 'MUTUAL_FUND', 'ETF', 'BOND', 'OTHER')),
  symbol          TEXT,
  name            TEXT NOT NULL,
  quantity        DECIMAL(20,4) NOT NULL CHECK (quantity > 0),
  purchase_price  DECIMAL(20,4) NOT NULL CHECK (purchase_price >= 0),
  current_value   DECIMAL(20,2) NOT NULL CHECK (current_value >= 0),
  purchase_date   DATE,
  currency        TEXT NOT NULL DEFAULT 'IDR',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN portfolio_holdings.quantity IS 'Base units (shares for stocks/ETFs, units for funds; IDX lots are converted to shares before storing)';
COMMENT ON COLUMN portfolio_holdings.purchase_price IS 'Cost per unit; cost_basis = quantity * purchase_price';
COMMENT ON COLUMN portfolio_holdings.current_value IS 'User-entered current valuation of the whole position (no live price feed)';

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_account ON portfolio_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user ON portfolio_holdings(user_id);

-- RLS: manage holdings only for accounts you own.
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings" ON portfolio_holdings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = portfolio_holdings.account_id AND accounts.user_id = auth.uid())
  );
CREATE POLICY "Users can insert holdings for their own accounts" ON portfolio_holdings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = portfolio_holdings.account_id AND accounts.user_id = auth.uid())
  );
CREATE POLICY "Users can update their own holdings" ON portfolio_holdings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = portfolio_holdings.account_id AND accounts.user_id = auth.uid())
  );
CREATE POLICY "Users can delete their own holdings" ON portfolio_holdings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM accounts WHERE accounts.id = portfolio_holdings.account_id AND accounts.user_id = auth.uid())
  );

-- updated_at maintenance (reuses the shared function).
CREATE TRIGGER update_portfolio_holdings_updated_at
  BEFORE UPDATE ON portfolio_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Balance sync: account.balance = SUM(current_value) of its holdings.
CREATE OR REPLACE FUNCTION sync_account_balance_from_holdings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_account UUID := COALESCE(NEW.account_id, OLD.account_id);
BEGIN
  UPDATE accounts
  SET balance = COALESCE(
        (SELECT SUM(current_value) FROM portfolio_holdings WHERE account_id = affected_account),
        0
      ),
      updated_at = NOW()
  WHERE id = affected_account;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_account_balance_from_holdings
  AFTER INSERT OR UPDATE OR DELETE ON portfolio_holdings
  FOR EACH ROW
  EXECUTE FUNCTION sync_account_balance_from_holdings();
