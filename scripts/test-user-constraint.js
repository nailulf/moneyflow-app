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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserConstraint() {
  console.log('Testing user constraint restoration...');
  
  try {
    // Try to insert a transaction with a non-existent user_id
    // This should fail if the constraint is properly restored
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Non-existent user
        date: '2024-01-01',
        description: 'Test transaction',
        amount: 100.00,
        type: 'EXPENSE'
      });
    
    if (error) {
      if (error.code === '23503') {
        console.log('✅ SUCCESS: Foreign key constraint is working!');
        console.log('Error message:', error.message);
        return true;
      } else {
        console.log('❌ Unexpected error:', error);
        return false;
      }
    } else {
      console.log('❌ FAILED: Transaction was inserted without constraint check!');
      console.log('Data:', data);
      return false;
    }
  } catch (err) {
    console.log('❌ Script error:', err);
    return false;
  }
}

// Run the test
testUserConstraint().then(success => {
  process.exit(success ? 0 : 1);
});