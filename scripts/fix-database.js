const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    return !error || error.code !== '42P01'
  } catch (err) {
    return false
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1)
    
    return !error
  } catch (err) {
    return false
  }
}

async function fixDatabase() {
  console.log('🔍 Checking database state...')
  
  // Check if category_groups table exists
  const categoryGroupsExists = await checkTableExists('category_groups')
  console.log(`Category groups table exists: ${categoryGroupsExists}`)
  
  // Check if category_group_id column exists in categories
  const columnExists = await checkColumnExists('categories', 'category_group_id')
  console.log(`Category group_id column exists: ${columnExists}`)
  
  if (categoryGroupsExists && columnExists) {
    console.log('✅ Database is already properly configured!')
    return true
  }
  
  console.log('\n❌ Database needs manual configuration. Please run these SQL commands in your Supabase dashboard:')
  console.log('\n1. Go to your Supabase project dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run the following SQL commands:')
  
  if (!categoryGroupsExists) {
    console.log('\n-- Create category_groups table:')
    console.log(`
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

-- Create indexes for category_groups:
CREATE INDEX IF NOT EXISTS idx_category_groups_user_id ON category_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_category_groups_type ON category_groups(type);
CREATE INDEX IF NOT EXISTS idx_category_groups_is_active ON category_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_user_active ON category_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_category_groups_sort_order ON category_groups(sort_order);`)
  }
  
  if (!columnExists) {
    console.log('\n-- Add category_group_id column to categories table:')
    console.log(`
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS category_group_id UUID;

-- Create index for category_group_id:
CREATE INDEX IF NOT EXISTS idx_categories_category_group_id ON categories(category_group_id);`)
  }
  
  console.log('\n4. After running the SQL commands, restart your development server')
  console.log('5. The default categories should then initialize automatically')
  
  return false
}

fixDatabase()
  .then(success => {
    if (success) {
      console.log('🎉 Database is ready!')
    } else {
      console.log('\n⚠️ Manual database setup required. Follow the instructions above.')
    }
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Database check failed:', error)
    process.exit(1)
  })