const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '..', '.env.local');
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
const testUserId = envVars.NEXT_PUBLIC_TEST_USER_ID;

if (!supabaseUrl || !supabaseServiceKey || !testUserId) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCategories() {
  console.log('🔍 Checking categories for user:', testUserId);
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', testUserId);
    
    const { data: activeData, error: activeError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', testUserId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    
    console.log(`\n📊 Found ${data?.length || 0} total categories`);
    console.log(`📊 Found ${activeData?.length || 0} active categories`);
    
    if (data && data.length > 0) {
      console.log('\n📋 All categories:');
      data.forEach(cat => {
        console.log(`- ${cat.name} (${cat.color}) - ${cat.group_type} - Active: ${cat.is_active} - ID: ${cat.id}`);
      });
    } else {
      console.log('❌ No categories found');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkCategories();