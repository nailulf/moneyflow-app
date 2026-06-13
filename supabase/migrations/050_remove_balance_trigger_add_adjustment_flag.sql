-- 050: Make transactions the single source of truth for account balances.
--
-- Removes the stored-balance trigger (migration 018). After this, accounts.balance
-- is an OPENING ANCHOR only — it is never auto-mutated by income/expense. Live balance
-- is computed in application code as: opening + Σ(transaction effects), transfer-aware.
--
-- Also adds transactions.is_balance_adjustment to mark reconciliation deltas. These DO
-- count toward budget totals and spending, booked to the generic Other/Uncategorized
-- category; the flag identifies them for future analytics (e.g. a separate breakdown line).

-- 1. Drop the stored-balance triggers + function from migration 018.
DROP TRIGGER IF EXISTS trigger_update_account_balance_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_update_account_balance_update ON transactions;
DROP TRIGGER IF EXISTS trigger_update_account_balance_delete ON transactions;
DROP FUNCTION IF EXISTS update_account_balance() CASCADE;

-- 2. Flag for synthetic balance-adjustment transactions.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_balance_adjustment BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Document the new semantics of accounts.balance.
COMMENT ON COLUMN accounts.balance IS
  'Opening anchor only. Live balance = balance + Σ(transaction effects) computed in app code (lib/account-balance.ts). NOT auto-maintained by any trigger as of migration 050.';

COMMENT ON COLUMN transactions.is_balance_adjustment IS
  'TRUE for synthetic reconciliation transactions created when a user edits their account balance directly. Counts toward budget totals but is shown under the Other/Uncategorized category, never a real one.';

-- 4. Link each adjustment audit row to the synthetic transaction it created.
ALTER TABLE account_balance_adjustments
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
