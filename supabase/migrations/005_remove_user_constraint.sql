-- Remove foreign key constraint that references non-existent users table
-- This constraint is blocking transaction creation since we use Supabase Auth
-- for user management instead of a local users table

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Add a comment to document why this constraint was removed
COMMENT ON COLUMN transactions.user_id IS 'References auth.users via Supabase Auth, no foreign key constraint needed';