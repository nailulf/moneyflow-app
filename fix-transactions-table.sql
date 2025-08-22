-- Fix transactions table to ensure category_id column exists
-- Run this in your Supabase SQL Editor

-- Check if category_id column exists and add it if missing
DO $$
BEGIN
    -- Check if category_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'category_id'
    ) THEN
        -- Add the category_id column
        ALTER TABLE transactions ADD COLUMN category_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_category 
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
        
        -- Create index
        CREATE INDEX idx_transactions_category_id ON transactions(category_id);
        
        RAISE NOTICE 'Added category_id column to transactions table';
    ELSE
        RAISE NOTICE 'category_id column already exists in transactions table';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'category_id';