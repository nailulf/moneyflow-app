-- Add recurring configuration columns to transactions table
ALTER TABLE transactions 
ADD COLUMN recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'yearly')),
ADD COLUMN recurring_end_date TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX idx_transactions_recurring_config 
ON transactions (is_recurring, recurring_frequency, recurring_end_date) 
WHERE is_recurring = true;
