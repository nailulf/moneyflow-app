#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found')
    process.exit(1)
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const envLines = envContent.split('\n')
  
  envLines.forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

loadEnvFile()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testUserId = process.env.NEXT_PUBLIC_TEST_USER_ID

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAccountsTable() {
  console.log('🔧 Creating accounts table...')
  
  try {
    // Since we can't execute DDL directly, let's create a default account for the test user
    // and let the table be created through the API
    console.log('📄 Creating default account for test user...')
    
    // First, let's try to create an account using the API
    const response = await fetch(`${supabaseUrl.replace('/rest/v1', '')}/rest/v1/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        user_id: testUserId,
        name: 'Current Account',
        type: 'BANK',
        balance: 0.00,
        is_default: true,
        is_active: true
      })
    })
    
    if (response.ok) {
      const account = await response.json()
      console.log('✅ Default account created:', account)
      return true
    } else {
      const error = await response.text()
      console.log('❌ API response:', error)
      
      // If the table doesn't exist, we need to create it manually
      console.log('📝 The accounts table needs to be created manually in Supabase.')
      console.log('🔗 Please go to your Supabase dashboard SQL editor and run:')
      console.log('=' + '='.repeat(60))
      
      // Read and display the migration file
      const migrationPath = path.join(__dirname, 'supabase', 'migrations', '017_create_accounts_table.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
      console.log(migrationSQL)
      console.log('=' + '='.repeat(60))
      
      return false
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

createAccountsTable().then(success => {
  if (success) {
    console.log('🎉 Accounts table setup completed!')
  } else {
    console.log('❌ Manual setup required - please run the SQL in Supabase dashboard')
    process.exit(1)
  }
})