#!/usr/bin/env node

/**
 * Script to create the missing test user in Supabase database
 * This fixes the immediate transaction creation issue
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env.local')
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

if (!supabaseUrl || !serviceRoleKey || !testUserId) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  console.error('- NEXT_PUBLIC_TEST_USER_ID:', !!testUserId)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  console.log('🔍 Checking if test user already exists...')
  
  try {
    // First check if user already exists by ID
    const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserById(testUserId)
    
    if (existingUser?.user) {
      console.log('✅ Test user already exists:')
      console.log('   ID:', existingUser.user.id)
      console.log('   Email:', existingUser.user.email)
      console.log('   Created:', existingUser.user.created_at)
      return existingUser.user
    }
    
    console.log('👤 Creating test user...')
    
    // Create the test user with specific ID
    const { data, error } = await supabase.auth.admin.createUser({
      user_id: testUserId,
      email: 'test@moneyflow.com',
      password: 'test123456',
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        role: 'test'
      }
    })
    
    if (error) {
      // If email already exists, try to find the user by email
      if (error.code === 'email_exists') {
        console.log('📧 Email already exists, searching for existing user...')
        
        // List users to find the one with our email
        const { data: usersList, error: listError } = await supabase.auth.admin.listUsers()
        
        if (listError) {
          console.error('❌ Error listing users:', listError)
          throw listError
        }
        
        const existingUserByEmail = usersList.users.find(user => user.email === 'test@moneyflow.com')
        
        if (existingUserByEmail) {
          console.log('✅ Found existing user with test email:')
          console.log('   ID:', existingUserByEmail.id)
          console.log('   Email:', existingUserByEmail.email)
          console.log('   Created:', existingUserByEmail.created_at)
          
          if (existingUserByEmail.id !== testUserId) {
            console.warn('⚠️  Existing user ID differs from expected:')
            console.warn('   Expected:', testUserId)
            console.warn('   Actual:', existingUserByEmail.id)
          }
          
          return existingUserByEmail
        }
      }
      
      console.error('❌ Error creating test user:', error)
      throw error
    }
    
    // Check if the created user has the expected ID
    if (data?.user && data.user.id !== testUserId) {
      console.warn('⚠️  Created user ID differs from expected:')
      console.warn('   Expected:', testUserId)
      console.warn('   Actual:', data.user.id)
      console.warn('   This may cause issues with the application')
    }
    
    console.log('✅ Test user created successfully:')
    console.log('   ID:', data.user.id)
    console.log('   Email:', data.user.email)
    console.log('   Created:', data.user.created_at)
    
    return data.user
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error)
    throw error
  }
}

async function verifyUserCreation(actualUserId = testUserId) {
  console.log('\n🔍 Verifying user creation...')
  
  try {
    const { data, error } = await supabase.auth.admin.getUserById(actualUserId)
    
    if (error) {
      console.error('❌ Verification failed:', error)
      return { success: false, userId: null }
    }
    
    if (data?.user) {
      console.log('✅ User verification successful')
      console.log('   User exists in auth.users table')
      console.log('   User ID:', data.user.id)
      return { success: true, userId: data.user.id }
    } else {
      console.error('❌ User not found after creation')
      return { success: false, userId: null }
    }
  } catch (error) {
    console.error('❌ Verification error:', error)
    return { success: false, userId: null }
  }
}

async function testTransactionCreation(actualUserId = testUserId) {
  console.log('\n🧪 Testing transaction creation...')
  
  try {
    // Test creating a transaction with the new user
    const testTransaction = {
      user_id: actualUserId,
      date: new Date().toISOString().split('T')[0],
      description: 'Test transaction',
      amount: 10.00,
      type: 'EXPENSE'
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([testTransaction])
      .select()
    
    if (error) {
      console.error('❌ Transaction creation failed:', error)
      return false
    }
    
    console.log('✅ Transaction creation successful:')
    console.log('   Transaction ID:', data[0].id)
    console.log('   Amount:', data[0].amount)
    console.log('   Description:', data[0].description)
    
    // Clean up test transaction
    await supabase
      .from('transactions')
      .delete()
      .eq('id', data[0].id)
    
    console.log('🧹 Test transaction cleaned up')
    
    return true
  } catch (error) {
    console.error('❌ Transaction test error:', error)
    return false
  }
}

async function main() {
  console.log('🚀 MoneyFlow Test User Creation Script')
  console.log('=====================================\n')
  
  try {
    // Step 1: Create test user
    const createdUser = await createTestUser()
    const actualUserId = createdUser.id
    
    // Step 2: Verify user creation
    const verification = await verifyUserCreation(actualUserId)
    if (!verification.success) {
      throw new Error('User verification failed')
    }
    
    // Step 3: Test transaction creation
    const transactionTest = await testTransactionCreation(actualUserId)
    if (!transactionTest) {
      console.warn('⚠️  Transaction creation test failed, but user was created successfully')
    }
    
    console.log('\n🎉 Setup completed successfully!')
    
    // Show important information about ID mismatch
    if (actualUserId !== testUserId) {
      console.log('\n⚠️  IMPORTANT: User ID Mismatch Detected')
      console.log('=====================================\n')
      console.log('The created user has a different ID than expected:')
      console.log('- Expected (NEXT_PUBLIC_TEST_USER_ID):', testUserId)
      console.log('- Actual (created user ID):', actualUserId)
      console.log('\nTo fix this, you have two options:')
      console.log('1. Update .env.local with the new user ID:')
      console.log(`   NEXT_PUBLIC_TEST_USER_ID=${actualUserId}`)
      console.log('2. Or implement proper authentication (recommended)')
    }
    
    console.log('\nNext steps:')
    console.log('1. Start the development server: npm run dev')
    console.log('2. Navigate to /spending/transaction')
    console.log('3. Try creating a transaction')
    console.log('\nTest user credentials:')
    console.log('- Email: test@moneyflow.com')
    console.log('- Password: test123456')
    console.log('- User ID:', actualUserId)
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

module.exports = { createTestUser, verifyUserCreation, testTransactionCreation }