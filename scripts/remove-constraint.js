const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
    return envVars
  } catch (error) {
    console.error('Error loading .env.local:', error.message)
    return {}
  }
}

const env = loadEnvFile()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function removeConstraint() {
  try {
    console.log('🔧 Testing transaction creation to check constraint...')
    
    // Try to create a test transaction to see if the constraint still exists
    const testTransaction = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      date: new Date().toISOString().split('T')[0],
      description: 'Test transaction',
      amount: 10.00,
      type: 'EXPENSE',
      category_id: null,
      merchant: 'Test merchant',
      notes: null,
      tags: null
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([testTransaction])
      .select()
    
    if (error) {
      if (error.code === '23503' && error.message.includes('transactions_user_id_fkey')) {
        console.log('❌ Foreign key constraint still exists:', error.message)
        console.log('\n🔧 The constraint needs to be removed manually.')
        console.log('\nSince we cannot execute DDL commands directly, you have a few options:')
        console.log('1. Use Supabase Dashboard SQL Editor to run:')
        console.log('   ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;')
        console.log('\n2. Or create a migration file in supabase/migrations/ with the above SQL')
        console.log('\n3. Or temporarily disable the constraint by creating a users table with the test user')
        return false
      } else {
        console.error('❌ Different error occurred:', error)
        return false
      }
    }
    
    console.log('✅ Transaction created successfully! Constraint is not blocking.')
    
    // Clean up the test transaction
    if (data && data[0]) {
      await supabase
        .from('transactions')
        .delete()
        .eq('id', data[0].id)
      console.log('🧹 Test transaction cleaned up')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

removeConstraint().then(success => {
  if (success) {
    console.log('\n🎉 Transaction creation should now work!')
    console.log('Try creating a transaction through the web interface.')
  } else {
    console.log('\n❌ Failed to remove constraint. Check the errors above.')
  }
  process.exit(success ? 0 : 1)
})