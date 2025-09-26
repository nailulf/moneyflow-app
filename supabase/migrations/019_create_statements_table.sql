-- Create statements table for PDF statement metadata
CREATE TABLE statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_checksum TEXT NOT NULL UNIQUE,
    bank_name TEXT NOT NULL,
    statement_period_start DATE,
    statement_period_end DATE,
    total_transactions INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('processing', 'completed', 'failed')),
    raw_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to transactions table for statement integration
ALTER TABLE transactions 
ADD COLUMN statement_id UUID REFERENCES statements(id) ON DELETE SET NULL,
ADD COLUMN raw_data TEXT,
ADD COLUMN posting_date DATE,
ADD COLUMN is_duplicate BOOLEAN DEFAULT FALSE,
ADD COLUMN duplicate_of UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_statements_user_id ON statements(user_id);
CREATE INDEX idx_statements_account_id ON statements(account_id);
CREATE INDEX idx_statements_checksum ON statements(file_checksum);
CREATE INDEX idx_statements_created_at ON statements(created_at);
CREATE INDEX idx_transactions_statement_id ON transactions(statement_id);
CREATE INDEX idx_transactions_posting_date ON transactions(posting_date);
CREATE INDEX idx_transactions_is_duplicate ON transactions(is_duplicate);
CREATE INDEX idx_transactions_duplicate_of ON transactions(duplicate_of);

-- Enable RLS on statements table
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for statements table
CREATE POLICY "Users can view their own statements" ON statements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statements" ON statements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statements" ON statements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statements" ON statements
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_statements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_statements_updated_at_trigger
    BEFORE UPDATE ON statements
    FOR EACH ROW
    EXECUTE FUNCTION update_statements_updated_at();

-- Create function to update total_transactions count
CREATE OR REPLACE FUNCTION update_statement_transaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.statement_id IS NOT NULL THEN
            UPDATE statements 
            SET total_transactions = total_transactions + 1
            WHERE id = NEW.statement_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.statement_id IS NOT NULL THEN
            UPDATE statements 
            SET total_transactions = total_transactions - 1
            WHERE id = OLD.statement_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle statement_id changes
        IF OLD.statement_id IS DISTINCT FROM NEW.statement_id THEN
            IF OLD.statement_id IS NOT NULL THEN
                UPDATE statements 
                SET total_transactions = total_transactions - 1
                WHERE id = OLD.statement_id;
            END IF;
            IF NEW.statement_id IS NOT NULL THEN
                UPDATE statements 
                SET total_transactions = total_transactions + 1
                WHERE id = NEW.statement_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain transaction count
CREATE TRIGGER update_statement_transaction_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_statement_transaction_count();