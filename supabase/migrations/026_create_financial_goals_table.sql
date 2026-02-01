-- Create financial_goals table
-- Goals track savings targets for bank and investment accounts

CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'emergency_fund',
    'vacation',
    'house_down_payment',
    'car_purchase',
    'education',
    'wedding',
    'investment',
    'other'
  )),
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  target_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One goal per account
  CONSTRAINT unique_account_goal UNIQUE (account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_goals_account ON financial_goals(account_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status) WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can manage goals for their own accounts
CREATE POLICY "Users can view their own goals" ON financial_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = financial_goals.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert goals for their own accounts" ON financial_goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = financial_goals.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own goals" ON financial_goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = financial_goals.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own goals" ON financial_goals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = financial_goals.account_id
      AND accounts.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-complete goal when account balance reaches target
CREATE OR REPLACE FUNCTION check_goal_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goal_record financial_goals%ROWTYPE;
BEGIN
  -- Find active goal for this account
  SELECT * INTO goal_record
  FROM financial_goals
  WHERE account_id = NEW.id
    AND status = 'active';

  -- If no active goal, exit
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Check if goal is completed (balance >= target)
  IF NEW.balance >= goal_record.target_amount THEN
    UPDATE financial_goals
    SET
      status = 'completed',
      updated_at = NOW()
    WHERE id = goal_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check goal completion when account balance changes
CREATE TRIGGER trigger_check_goal_completion
  AFTER UPDATE OF balance ON accounts
  FOR EACH ROW
  WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
  EXECUTE FUNCTION check_goal_completion();
