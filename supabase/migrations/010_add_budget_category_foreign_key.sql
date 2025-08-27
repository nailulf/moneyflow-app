-- Add foreign key constraint between budget_categories and categories
-- This will allow Supabase to understand the relationship for joins

-- First, we need to change the category_id column type from VARCHAR to UUID
-- to match the categories.id column type

-- Step 1: Drop any existing data that might have invalid UUIDs
DELETE FROM budget_categories 
WHERE category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 2: Change the column type from VARCHAR to UUID
ALTER TABLE budget_categories 
ALTER COLUMN category_id TYPE UUID USING category_id::UUID;

-- Step 3: Clean up any invalid category_id references
DELETE FROM budget_categories 
WHERE category_id NOT IN (SELECT id FROM categories);

-- Step 4: Add the foreign key constraint
ALTER TABLE budget_categories 
ADD CONSTRAINT fk_budget_categories_category_id 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- Step 5: Add an index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_budget_categories_category_fk 
ON budget_categories(category_id);

-- Add comment to document the relationship
COMMENT ON CONSTRAINT fk_budget_categories_category_id ON budget_categories 
IS 'Foreign key relationship between budget_categories and categories tables';