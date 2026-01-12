-- Update recurring_frequency check constraint to include 'daily'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_recurring_frequency_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_recurring_frequency_check 
CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly'));
