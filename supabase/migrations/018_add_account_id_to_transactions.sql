-- Add account_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN account_id UUID;

-- Add foreign key constraint
ALTER TABLE transactions 
ADD CONSTRAINT fk_transactions_account 
FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- Create index for account_id
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON transactions(user_id, account_id);

-- Update existing transactions to use the default account for each user
UPDATE transactions 
SET account_id = (
  SELECT id 
  FROM accounts 
  WHERE accounts.user_id = transactions.user_id 
  AND accounts.is_default = TRUE 
  LIMIT 1
)
WHERE account_id IS NULL;

-- Create function to update account balance when transactions change
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    UPDATE accounts 
    SET balance = balance + 
      CASE 
        WHEN NEW.type = 'INCOME' THEN NEW.amount
        WHEN NEW.type = 'EXPENSE' THEN -NEW.amount
        ELSE 0 -- TRANSFER handled separately
      END,
      updated_at = NOW()
    WHERE id = NEW.account_id;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Revert old transaction effect
    IF OLD.account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance - 
        CASE 
          WHEN OLD.type = 'INCOME' THEN OLD.amount
          WHEN OLD.type = 'EXPENSE' THEN -OLD.amount
          ELSE 0
        END,
        updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Apply new transaction effect
    IF NEW.account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance + 
        CASE 
          WHEN NEW.type = 'INCOME' THEN NEW.amount
          WHEN NEW.type = 'EXPENSE' THEN -NEW.amount
          ELSE 0
        END,
        updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance - 
        CASE 
          WHEN OLD.type = 'INCOME' THEN OLD.amount
          WHEN OLD.type = 'EXPENSE' THEN -OLD.amount
          ELSE 0
        END,
        updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for account balance updates
CREATE TRIGGER trigger_update_account_balance_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER trigger_update_account_balance_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER trigger_update_account_balance_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();