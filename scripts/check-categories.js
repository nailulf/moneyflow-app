const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function checkCategories() {
  console.log('🔍 Checking categories for user:', USER_ID);
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', USER_ID);
    
    const { data: activeData, error: activeError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', USER_ID)
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