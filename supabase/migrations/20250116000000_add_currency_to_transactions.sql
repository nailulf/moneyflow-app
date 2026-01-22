ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'IDR';
