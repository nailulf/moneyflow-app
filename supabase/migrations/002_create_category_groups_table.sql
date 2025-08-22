-- Create category_groups table to support custom category groups
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
  
  -- Constraints
  CONSTRAINT category_groups_user_name_unique UNIQUE (user_id, name)
);

-- Create indexes for category_groups
CREATE INDEX IF NOT EXISTS idx_category_groups_user_id ON category_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_category_groups_type ON category_groups(type);
CREATE INDEX IF NOT EXISTS idx_category_groups_is_active ON category_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_user_active ON category_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_sort_order ON category_groups(sort_order);

-- Add category_group_id to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_group_id UUID;

-- Add foreign key constraint
ALTER TABLE categories ADD CONSTRAINT fk_categories_category_group 
  FOREIGN KEY (category_group_id) REFERENCES category_groups(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_categories_category_group_id ON categories(category_group_id);

-- Enable Row Level Security for category_groups
ALTER TABLE category_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for category_groups
CREATE POLICY "Users can view their own category groups" ON category_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category groups" ON category_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category groups" ON category_groups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category groups" ON category_groups
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on category_groups
CREATE TRIGGER update_category_groups_updated_at
  BEFORE UPDATE ON category_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default category groups for existing users
INSERT INTO category_groups (user_id, name, type, color, is_default, sort_order)
SELECT DISTINCT 
  user_id,
  CASE 
    WHEN group_type = 'EXPENSE' THEN 'Expenses'
    WHEN group_type = 'INCOME' THEN 'Income'
    WHEN group_type = 'TRANSFER' THEN 'Transfer'
  END as name,
  group_type as type,
  CASE 
    WHEN group_type = 'EXPENSE' THEN '#EF4444'
    WHEN group_type = 'INCOME' THEN '#10B981'
    WHEN group_type = 'TRANSFER' THEN '#6B7280'
  END as color,
  true as is_default,
  CASE 
    WHEN group_type = 'EXPENSE' THEN 1
    WHEN group_type = 'INCOME' THEN 2
    WHEN group_type = 'TRANSFER' THEN 3
  END as sort_order
FROM categories
WHERE NOT EXISTS (
  SELECT 1 FROM category_groups cg 
  WHERE cg.user_id = categories.user_id 
  AND cg.type = categories.group_type
)
ON CONFLICT (user_id, name) DO NOTHING;

-- Update existing categories to link with their respective category groups
UPDATE categories 
SET category_group_id = cg.id
FROM category_groups cg
WHERE categories.user_id = cg.user_id 
  AND categories.group_type = cg.type 
  AND cg.is_default = true
  AND categories.category_group_id IS NULL;