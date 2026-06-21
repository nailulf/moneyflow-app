-- Per-asset investment ledger (buy/sell/dividend). Becomes the source of truth
-- for a holding's quantity, average cost, and (book) value. The recompute trigger
-- writes portfolio_holdings.current_value, which the 049 trigger then sums into
-- accounts.balance — so buys/sells update the account balance automatically.

-- Holdings can now reach quantity 0 (fully sold), so relax the 049 CHECK.
ALTER TABLE portfolio_holdings DROP CONSTRAINT IF EXISTS portfolio_holdings_quantity_check;
ALTER TABLE portfolio_holdings ADD CONSTRAINT portfolio_holdings_quantity_nonneg CHECK (quantity >= 0);

-- Link a cash inflow transaction back to the sell that produced it (for edit/delete sync).
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS source_investment_txn_id UUID;

CREATE TABLE IF NOT EXISTS investment_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id        UUID NOT NULL REFERENCES portfolio_holdings(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DIVIDEND')),
  quantity          DECIMAL(20,4) NOT NULL CHECK (quantity > 0),
  price_per_unit    DECIMAL(20,4) NOT NULL CHECK (price_per_unit >= 0),
  total_amount      DECIMAL(20,2) NOT NULL CHECK (total_amount >= 0),
  realized_pl       DECIMAL(20,2),
  cash_account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_date  DATE NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'IDR',
  notes             TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_investment_txn_fk
  FOREIGN KEY (source_investment_txn_id) REFERENCES investment_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invtxn_holding ON investment_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_invtxn_account ON investment_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_invtxn_user ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_txn_source_invtxn ON transactions(source_investment_txn_id);

-- RLS: manage ledger rows only for accounts you own. Editable (no immutability).
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own investment txns" ON investment_transactions
  FOR SELECT USING (EXISTS (SELECT 1 FROM accounts a WHERE a.id = investment_transactions.account_id AND a.user_id = auth.uid()));
CREATE POLICY "insert own investment txns" ON investment_transactions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM accounts a WHERE a.id = investment_transactions.account_id AND a.user_id = auth.uid()));
CREATE POLICY "update own investment txns" ON investment_transactions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM accounts a WHERE a.id = investment_transactions.account_id AND a.user_id = auth.uid()));
CREATE POLICY "delete own investment txns" ON investment_transactions
  FOR DELETE USING (EXISTS (SELECT 1 FROM accounts a WHERE a.id = investment_transactions.account_id AND a.user_id = auth.uid()));

CREATE TRIGGER update_investment_transactions_updated_at
  BEFORE UPDATE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recompute a holding's derived columns from its ledger.
CREATE OR REPLACE FUNCTION recompute_holding(p_holding_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buy_qty   NUMERIC := 0;
  buy_cost  NUMERIC := 0;
  sell_qty  NUMERIC := 0;
  avg_cost  NUMERIC := 0;
  net_qty   NUMERIC := 0;
BEGIN
  SELECT
    COALESCE(SUM(quantity) FILTER (WHERE type = 'BUY'), 0),
    COALESCE(SUM(quantity * price_per_unit) FILTER (WHERE type = 'BUY'), 0),
    COALESCE(SUM(quantity) FILTER (WHERE type = 'SELL'), 0)
  INTO buy_qty, buy_cost, sell_qty
  FROM investment_transactions WHERE holding_id = p_holding_id;

  IF buy_qty > 0 THEN avg_cost := buy_cost / buy_qty; END IF;
  net_qty := buy_qty - sell_qty;

  UPDATE portfolio_holdings
  SET quantity = net_qty,
      purchase_price = avg_cost,
      current_value = GREATEST(net_qty, 0) * avg_cost,
      updated_at = NOW()
  WHERE id = p_holding_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recompute_holding_fn()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recompute_holding(COALESCE(NEW.holding_id, OLD.holding_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_holding
  AFTER INSERT OR UPDATE OR DELETE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION trg_recompute_holding_fn();

-- Create a holding + its opening BUY atomically. Returns the new holding id.
CREATE OR REPLACE FUNCTION add_investment_asset(
  p_account_id UUID,
  p_user_id UUID,
  p_asset_class TEXT,
  p_symbol TEXT,
  p_name TEXT,
  p_currency TEXT,
  p_quantity NUMERIC,
  p_price_per_unit NUMERIC,
  p_transaction_date DATE
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_holding_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id AND user_id = p_user_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized to add assets to this account';
  END IF;

  INSERT INTO portfolio_holdings (account_id, user_id, asset_class, symbol, name, quantity, purchase_price, current_value, purchase_date, currency)
  VALUES (p_account_id, p_user_id, p_asset_class, p_symbol, p_name, 0, 0, 0, p_transaction_date, p_currency)
  RETURNING id INTO v_holding_id;

  INSERT INTO investment_transactions (holding_id, account_id, user_id, type, quantity, price_per_unit, total_amount, transaction_date, currency)
  VALUES (v_holding_id, p_account_id, p_user_id, 'BUY', p_quantity, p_price_per_unit, ROUND(p_quantity * p_price_per_unit, 2), p_transaction_date, p_currency);

  RETURN v_holding_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE investment_transactions IS 'Per-asset buy/sell/dividend ledger; recompute_holding() derives holding qty/avg-cost/book-value from it.';
