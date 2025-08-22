-- Remove the foreign key constraint that's causing transaction creation to fail
-- This constraint references a non-existent users table
-- Since we're using Supabase Auth, we don't need this constraint

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Verify the constraint has been removed
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_name = 'transactions_user_id_fkey';

-- This should return no rows if the constraint was successfully removed