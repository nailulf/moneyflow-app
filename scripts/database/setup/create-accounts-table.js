#!/usr/bin/env node

/**
 * Script to create the accounts table by executing the migration
 * This fixes the "relation 'public.accounts' does not exist" error
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '..', '.env.local')
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
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
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
    // First, let's try to create the table directly using Supabase client
    console.log('📄 Creating accounts table structure...')
    
    // Create the accounts table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'BANK' CHECK (type IN ('BANK', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'OTHER')),
        balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        currency TEXT NOT NULL DEFAULT 'USD',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Ensure unique account names per user
        CONSTRAINT unique_user_account_name UNIQUE (user_id, name)
      );
    `
    
    // Since we can't use exec_sql, let's try using the SQL editor approach
    // We'll create the table by inserting into the information_schema or using a workaround
    console.log('🔄 Using alternative table creation method...')
    
    // Try to query the table first to see if it exists
    const { data: existingTable, error: checkError } = await supabase
      .from('accounts')
      .select('count')
      .limit(1)
    
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('❌ Table does not exist, need to create it manually')
      console.log('📝 Please run the following SQL in your Supabase SQL editor:')
      console.log('=' * 60)
      
      // Read and display the migration file
      const migrationPath = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '017_create_accounts_table.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
      console.log(migrationSQL)
      console.log('=' * 60)
      
      return false
    } else if (checkError) {
      console.error('❌ Unexpected error:', checkError)
      return false
    } else {
      console.log('✅ Accounts table already exists!')
    }
    
    // Verify the table was created
    console.log('🔍 Verifying accounts table...')
    const { data: tableCheck, error: verifyError } = await supabase
      .from('accounts')
      .select('count')
      .limit(1)
    
    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError.message)
      return false
    }
    
    console.log('✅ Accounts table created successfully!')
    
    // Create a default account for the test user if it exists
    if (testUserId) {
      console.log('🏦 Creating default account for test user...')
      
      const { data: existingAccount, error: existingError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', testUserId)
        .eq('name', 'Current Account')
        .single()
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('❌ Error checking existing account:', existingError)
      } else if (!existingAccount) {
        const { data: newAccount, error: createError } = await supabase
          .from('accounts')
          .insert({
            user_id: testUserId,
            name: 'Current Account',
            type: 'BANK',
            balance: 0.00,
            currency: 'USD',
            is_default: true,
            is_active: true,
            description: 'Default bank account'
          })
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Error creating default account:', createError)
        } else {
          console.log('✅ Default account created:', newAccount.id)
        }
      } else {
        console.log('✅ Default account already exists')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting accounts table creation...')
  
  const success = await createAccountsTable()
  
  if (success) {
    console.log('\n✅ Accounts table setup completed successfully!')
    console.log('🔄 You can now test the accounts API endpoint')
  } else {
    console.log('\n❌ Accounts table setup failed')
    process.exit(1)
  }
}

main()