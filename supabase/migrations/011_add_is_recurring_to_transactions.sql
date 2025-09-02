-- Add is_recurring column to transactions table
ALTER TABLE transactions 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;

-- Update existing transactions to have is_recurring = false
UPDATE transactions 
SET is_recurring = FALSE 
WHERE is_recurring IS NULL;

-- Make the column NOT NULL
ALTER TABLE transactions 
ALTER COLUMN is_recurring SET NOT NULL;