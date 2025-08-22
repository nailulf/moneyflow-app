const { createClient } = require('@supabase/supabase-js')

// Read environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUserConstraint() {
  try {
    console.log('🔍 Checking foreign key constraints...')
    
    // Check if the constraint exists
    const { data: constraints, error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_user_id_fkey';
      `
    })
    
    if (constraintError) {
      console.log('⚠️  Cannot check constraints via RPC, trying alternative approach...')
      
      // Try to insert a test transaction to see the exact error
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'
      
      console.log('🧪 Testing transaction creation...')
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: testUserId,
          date: '2024-01-01',
          description: 'Test transaction',
          amount: 10.00,
          type: 'EXPENSE'
        })
        .select()
        .single()
      
      if (error) {
        console.log('❌ Error details:', error)
        
        if (error.code === '23503' && error.message.includes('transactions_user_id_fkey')) {
          console.log('\n🔧 The issue is a foreign key constraint to a non-existent users table.')
          console.log('\n📋 Solutions:')
          console.log('1. Remove the foreign key constraint (recommended for development)')
          console.log('2. Create a users table with the test user')
          console.log('3. Use Supabase Auth to create real users')
          
          console.log('\n🛠️  To fix this, run one of these SQL commands in your Supabase dashboard:')
          console.log('\n-- Option 1: Remove the constraint (recommended for development)')
          console.log('ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;')
          
          console.log('\n-- Option 2: Create a simple users table')
          console.log(`CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO users (id, email) VALUES 
('${testUserId}', 'test@example.com')
ON CONFLICT (id) DO NOTHING;`)
        }
      } else {
        console.log('✅ Transaction created successfully:', data)
      }
    } else {
      console.log('📊 Constraints found:', constraints)
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

fixUserConstraint()