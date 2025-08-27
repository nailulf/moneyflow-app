-- Remove the foreign key constraint that's causing transaction creation to fail
-- This constraint references a 'users' table that doesn't exist in our schema
-- Since we're using Supabase Auth, user management is handled externally

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Verify the constraint has been removed
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
AND conname = 'transactions_user_id_fkey';