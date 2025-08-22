-- Restore foreign key constraint for user_id to reference auth.users
-- This is needed for testing purposes to ensure data integrity

-- First, clean up any orphaned transactions that reference non-existent users
-- This removes transactions where user_id doesn't exist in auth.users
DELETE FROM transactions 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraint back to transactions table
ALTER TABLE transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the comment to reflect the restored constraint
COMMENT ON COLUMN transactions.user_id IS 'References auth.users with foreign key constraint for data integrity';

-- Ensure the constraint is properly indexed (should already exist from migration 003)
-- CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);