-- MoneyFlow App Database Setup Script
-- Run this in your Supabase SQL Editor to create missing tables and columns

-- 1. Create category_groups table
CREATE TABLE IF NOT EXISTS category_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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

-- 2. Create indexes for category_groups
CREATE INDEX IF NOT EXISTS idx_category_groups_user_id ON category_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_category_groups_type ON category_groups(type);
CREATE INDEX IF NOT EXISTS idx_category_groups_is_active ON category_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_user_active ON category_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_sort_order ON category_groups(sort_order);

-- 3. Add category_group_id column to categories table (if it doesn't exist)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_group_id UUID;

-- 4. Add foreign key constraint
ALTER TABLE categories ADD CONSTRAINT IF NOT EXISTS fk_categories_category_group 
  FOREIGN KEY (category_group_id) REFERENCES category_groups(id) ON DELETE SET NULL;

-- 5. Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_categories_category_group_id ON categories(category_group_id);

-- 6. Insert default category groups for test user
INSERT INTO category_groups (user_id, name, type, color, is_default, sort_order)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Expenses', 'EXPENSE', '#EF4444', true, 1),
  ('550e8400-e29b-41d4-a716-446655440000', 'Income', 'INCOME', '#10B981', true, 2),
  ('550e8400-e29b-41d4-a716-446655440000', 'Transfer', 'TRANSFER', '#6B7280', true, 3)
ON CONFLICT (user_id, name) DO NOTHING;

-- 7. Get the category group IDs for linking categories
DO $$
DECLARE
    expense_group_id UUID;
    income_group_id UUID;
    transfer_group_id UUID;
BEGIN
    -- Get group IDs
    SELECT id INTO expense_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' AND type = 'EXPENSE';
    SELECT id INTO income_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' AND type = 'INCOME';
    SELECT id INTO transfer_group_id FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' AND type = 'TRANSFER';
    
    -- Insert default categories if they don't exist
    INSERT INTO categories (user_id, name, color, group_type, category_group_id, is_custom)
    VALUES 
      ('550e8400-e29b-41d4-a716-446655440000', 'Food & Dining', '#FF6B6B', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Transportation', '#4ECDC4', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Shopping', '#45B7D1', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Entertainment', '#96CEB4', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Bills & Utilities', '#FFEAA7', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Healthcare', '#DDA0DD', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Education', '#98D8C8', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Travel', '#F7DC6F', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Other', '#AED6F1', 'EXPENSE', expense_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Income', '#82E0AA', 'INCOME', income_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Transfer', '#9CA3AF', 'TRANSFER', transfer_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Savings transfer', '#6B7280', 'TRANSFER', transfer_group_id, false),
      ('550e8400-e29b-41d4-a716-446655440000', 'Credit card payment', '#4B5563', 'TRANSFER', transfer_group_id, false)
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- Update existing categories to link them to category groups if they're not linked
    UPDATE categories 
    SET category_group_id = expense_group_id 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
      AND group_type = 'EXPENSE' 
      AND category_group_id IS NULL;
      
    UPDATE categories 
    SET category_group_id = income_group_id 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
      AND group_type = 'INCOME' 
      AND category_group_id IS NULL;
      
    UPDATE categories 
    SET category_group_id = transfer_group_id 
    WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
      AND group_type = 'TRANSFER' 
      AND category_group_id IS NULL;
END $$;

-- 8. Verify the setup
SELECT 'Category Groups' as table_name, count(*) as record_count 
FROM category_groups WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Categories' as table_name, count(*) as record_count 
FROM categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Transactions' as table_name, count(*) as record_count 
FROM transactions WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- Success message
SELECT '✅ Database setup completed successfully!' as status;