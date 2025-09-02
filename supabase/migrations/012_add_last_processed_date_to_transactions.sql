-- Add last_processed_date field to transactions table for recurring transaction tracking
ALTER TABLE transactions 
ADD COLUMN last_processed_date TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of recurring transactions
CREATE INDEX idx_transactions_recurring_processed 
ON transactions (is_recurring, last_processed_date) 
WHERE is_recurring = true;

-- Add comment to explain the field
COMMENT ON COLUMN transactions.last_processed_date IS 'Timestamp when this recurring transaction was last processed to generate a new transaction';