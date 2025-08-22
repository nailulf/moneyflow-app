-- Add updated_at column to transactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records to have updated_at = created_at
        UPDATE transactions 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to transactions table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in transactions table';
    END IF;
END $$;

-- Create or replace trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();