const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('categories').select('*').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.error('Database connection failed:', error);
      return;
    }
    console.log('✅ Database connection successful');
    
    // Check if tables exist
    console.log('\nChecking existing tables...');
    
    const tables = ['categories', 'category_groups', 'transactions'];
    const tableStatus = {};
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}' does not exist or has issues:`, error.message);
        tableStatus[table] = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
        tableStatus[table] = true;
      }
    }
    
    // Create category_groups table if it doesn't exist
    if (!tableStatus.category_groups) {
      console.log('\n🔧 Creating category_groups table...');
      
      // First, let's try to create the table using raw SQL
      const createTableSQL = `
        CREATE TABLE category_groups (
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
        
        CREATE INDEX idx_category_groups_user_id ON category_groups(user_id);
        CREATE INDEX idx_category_groups_type ON category_groups(type);
        CREATE INDEX idx_category_groups_is_active ON category_groups(is_active);
        CREATE INDEX idx_category_groups_user_active ON category_groups(user_id, is_active);
        CREATE INDEX idx_category_groups_sort_order ON category_groups(sort_order);
      `;
      
      // Execute the SQL using a simple insert that will fail but might give us more info
      try {
        // Try to insert a test record to see if we can create the table structure
        const { data: insertData, error: insertError } = await supabase
          .from('category_groups')
          .insert({
            user_id: 'test',
            name: 'Test Group',
            type: 'EXPENSE',
            color: '#FF0000',
            is_default: false,
            is_active: true,
            sort_order: 1
          })
          .select();
          
        if (insertError) {
          console.log('❌ Cannot insert into category_groups:', insertError.message);
          console.log('\n📝 You need to manually create the category_groups table in your Supabase dashboard.');
          console.log('\nSQL to run in Supabase SQL Editor:');
          console.log(createTableSQL);
        } else {
          console.log('✅ category_groups table is working!');
          // Clean up test record
          await supabase.from('category_groups').delete().eq('user_id', 'test');
        }
      } catch (err) {
        console.log('❌ Error testing category_groups:', err.message);
      }
    }
    
    // Check if categories table has category_group_id column
    console.log('\n🔧 Checking categories table structure...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1);
      
    if (categoriesData && categoriesData.length > 0) {
      const firstCategory = categoriesData[0];
      if (!firstCategory.hasOwnProperty('category_group_id')) {
        console.log('❌ categories table missing category_group_id column');
        console.log('\nSQL to add missing column:');
        console.log('ALTER TABLE categories ADD COLUMN category_group_id UUID;');
      } else {
        console.log('✅ categories table has category_group_id column');
      }
    }
    
    // Initialize default category groups for test user
    if (tableStatus.category_groups) {
      console.log('\n🔧 Checking default category groups for test user...');
      const testUserId = envVars.NEXT_PUBLIC_TEST_USER_ID;
      
      const { data: existingGroups, error: groupsError } = await supabase
        .from('category_groups')
        .select('*')
        .eq('user_id', testUserId);
        
      if (!groupsError && existingGroups.length === 0) {
        console.log('🔧 Creating default category groups...');
        
        const defaultGroups = [
          {
            user_id: testUserId,
            name: 'Expenses',
            type: 'EXPENSE',
            color: '#EF4444',
            is_default: true,
            sort_order: 1
          },
          {
            user_id: testUserId,
            name: 'Income',
            type: 'INCOME',
            color: '#10B981',
            is_default: true,
            sort_order: 2
          },
          {
            user_id: testUserId,
            name: 'Transfer',
            type: 'TRANSFER',
            color: '#6B7280',
            is_default: true,
            sort_order: 3
          }
        ];
        
        for (const group of defaultGroups) {
          const { data, error } = await supabase
            .from('category_groups')
            .insert(group)
            .select();
            
          if (error) {
            console.log(`❌ Failed to create ${group.name} group:`, error.message);
          } else {
            console.log(`✅ Created ${group.name} group`);
          }
        }
      } else if (!groupsError) {
        console.log(`✅ Found ${existingGroups.length} existing category groups for test user`);
      }
    }
    
    console.log('\n✅ Database setup completed');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();