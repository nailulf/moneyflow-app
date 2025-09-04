-- Migration to drop duplicate index on budget_categories table
-- The table has two identical indexes on the category_id column:
-- 1. idx_budget_categories_category_id (created in migration 008)
-- 2. idx_budget_categories_category_fk (created in migration 010)

-- Drop the older index and keep the newer one that was created with the foreign key
DROP INDEX IF EXISTS idx_budget_categories_category_id;

-- Add a comment to document why we're keeping idx_budget_categories_category_fk
COMMENT ON INDEX idx_budget_categories_category_fk
IS 'Index for the foreign key relationship between budget_categories and categories tables. Replaced duplicate index idx_budget_categories_category_id.';