-- Complete Database Fix for MoneyFlow App
-- Run this in your Supabase SQL Editor to fix all database issues

-- 0. Fix existing tables with TEXT user_id columns to UUID
-- This handles cases where tables were created with older scripts
DO $$
BEGIN
  -- Check and alter categories table if user_id is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name = 'user_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE categories ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;
  
  -- Check and alter category_groups table if user_id is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'category_groups' 
    AND column_name = 'user_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE category_groups ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;
  
  -- Check and alter transactions table if user_id is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'user_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;
END $$;

-- 1. Fix check constraints if they exist with wrong values
DO $$
BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'categories' 
    AND constraint_name = 'categories_group_type_check'
  ) THEN
    ALTER TABLE categories DROP CONSTRAINT categories_group_type_check;
  END IF;
  
  -- Add the correct check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'categories'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_group_type_check 
      CHECK (group_type IN ('EXPENSE', 'INCOME', 'TRANSFER'));
  END IF;
END $$;

-- 2. Ensure categories table exists with proper structure
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  group_type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (group_type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
  category_group_id UUID,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT categories_user_name_group_unique UNIQUE (user_id, name, group_type)
);

-- 3. Ensure category_groups table exists
CREATE TABLE IF NOT EXISTS category_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER', 'CUSTOM')),
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT category_groups_user_name_unique UNIQUE (user_id, name)
);

-- 4. Create or fix transactions table with all required columns
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
  category_id UUID,
  merchant TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add missing columns to existing tables if they don't exist
DO $$
BEGIN
    -- Add category_id to transactions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN category_id UUID;
        RAISE NOTICE 'Added category_id column to transactions table';
    END IF;
    
    -- Add merchant to transactions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'merchant'
    ) THEN
        ALTER TABLE transactions ADD COLUMN merchant TEXT;
        RAISE NOTICE 'Added merchant column to transactions table';
    END IF;
    
    -- Add notes to transactions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'notes'
    ) THEN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to transactions table';
    END IF;
    
    -- Add tags to transactions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'tags'
    ) THEN
        ALTER TABLE transactions ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column to transactions table';
    END IF;
    
    -- Add updated_at to transactions if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to transactions table';
    END IF;
    
    -- Add category_group_id to categories if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'category_group_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN category_group_id UUID;
        RAISE NOTICE 'Added category_group_id column to categories table';
    END IF;
END $$;

-- 6. Create foreign key constraints if they don't exist
DO $$
BEGIN
    -- Foreign key from transactions to categories
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_transactions_category'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT fk_transactions_category 
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint from transactions to categories';
    END IF;
    
    -- Foreign key from categories to category_groups
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_categories_category_group'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT fk_categories_category_group 
            FOREIGN KEY (category_group_id) REFERENCES category_groups(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint from categories to category_groups';
    END IF;
END $$;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_group_type ON categories(group_type);
CREATE INDEX IF NOT EXISTS idx_categories_category_group_id ON categories(category_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_category_groups_user_id ON category_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_category_groups_type ON category_groups(type);
CREATE INDEX IF NOT EXISTS idx_category_groups_is_active ON category_groups(is_active);

-- 8. Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Create RLS policies for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- 11. Create RLS policies for category_groups
DROP POLICY IF EXISTS "Users can view their own category groups" ON category_groups;
CREATE POLICY "Users can view their own category groups" ON category_groups
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own category groups" ON category_groups;
CREATE POLICY "Users can insert their own category groups" ON category_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own category groups" ON category_groups;
CREATE POLICY "Users can update their own category groups" ON category_groups
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own category groups" ON category_groups;
CREATE POLICY "Users can delete their own category groups" ON category_groups
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Insert default categories for test user if they don't exist
INSERT INTO category_groups (user_id, name, type, color, is_default, sort_order)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Expenses', 'EXPENSE', '#EF4444', true, 1),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Income', 'INCOME', '#10B981', true, 2),
  ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Transfer', 'TRANSFER', '#6B7280', true, 3)
ON CONFLICT (user_id, name) DO NOTHING;

-- 13. Insert default categories
DO $$
DECLARE
    expense_group_id UUID;
    income_group_id UUID;
    transfer_group_id UUID;
BEGIN
    -- Get group IDs
    SELECT id INTO expense_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid AND type = 'EXPENSE';
    SELECT id INTO income_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid AND type = 'INCOME';
    SELECT id INTO transfer_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid AND type = 'TRANSFER';
    
    -- Insert default categories if they don't exist
    INSERT INTO categories (user_id, name, color, group_type, category_group_id, is_custom)
    VALUES 
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Transportation', '#4ECDC4', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Shopping', '#45B7D1', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Entertainment', '#96CEB4', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Bills & Utilities', '#FFEAA7', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Healthcare', '#DDA0DD', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Education', '#98D8C8', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Travel', '#F7DC6F', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Other', '#AED6F1', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Income', '#82E0AA', 'INCOME', income_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Transfer', '#9CA3AF', 'TRANSFER', transfer_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Savings transfer', '#6B7280', 'TRANSFER', transfer_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Credit card payment', '#4B5563', 'TRANSFER', transfer_group_id, false)
    ON CONFLICT (user_id, name, group_type) DO NOTHING;
END $$;

-- 14. Verify the setup
SELECT 'Database Fix Complete!' as status;
SELECT 'Tables Created:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('transactions', 'categories', 'category_groups');

SELECT 'Transaction Table Columns:' as info;
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position;

SELECT 'Test Data Count:' as info;
SELECT 'Category Groups' as table_name, count(*) as record_count FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
UNION ALL
SELECT 'Categories' as table_name, count(*) as record_count FROM categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
UNION ALL
SELECT 'Transactions' as table_name, count(*) as record_count FROM transactions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;