#!/usr/bin/env node

/**
 * SAFE VERSION: Populate sample transactions WITHOUT deleting existing data
 * This script adds sample transactions while preserving existing ones
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '../../.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        if (value.startsWith('"') && value.endsWith('"')) {
          process.env[key.trim()] = value.slice(1, -1)
        } else {
          process.env[key.trim()] = value
        }
      }
    })
  } else {
    console.log('⚠️  .env.local file not found, using system environment variables')
  }
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

/**
 * Create a backup of existing transactions
 */
async function backupExistingTransactions(userId) {
  console.log('💾 Creating backup of existing transactions...')
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
  
  if (error) {
    throw new Error(`Failed to backup transactions: ${error.message}`)
  }
  
  if (transactions && transactions.length > 0) {
    const backupDir = path.join(__dirname, '../backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `transactions-backup-${timestamp}.json`)
    
    fs.writeFileSync(backupFile, JSON.stringify(transactions, null, 2))
    console.log(`✅ Backup created: ${backupFile}`)
    console.log(`   Backed up ${transactions.length} transactions`)
    
    return backupFile
  } else {
    console.log('ℹ️  No existing transactions to backup')
    return null
  }
}

/**
 * Generate sample transactions (reusing existing function)
 */
async function generateSampleTransactions(userId) {
  // Import the existing generation logic
  const { generateSampleTransactions: originalGenerate } = require('./populate-sample-transactions.js')
  return await originalGenerate(userId)
}

/**
 * SAFE populate function that preserves existing data
 */
async function populateTransactionsSafe() {
  console.log('🚀 Starting SAFE transaction population...')
  console.log(`   Target User ID: ${testUserId}`)
  
  try {
    // Check existing transactions
    const { data: existingTransactions, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', testUserId)
    
    if (checkError) {
      throw new Error(`Failed to check existing transactions: ${checkError.message}`)
    }
    
    if (existingTransactions && existingTransactions.length > 0) {
      console.log(`ℹ️  Found ${existingTransactions.length} existing transactions`)
      console.log('✅ SAFE MODE: Preserving existing transactions')
      
      // Create backup before adding new data
      await backupExistingTransactions(testUserId)
    } else {
      console.log('ℹ️  No existing transactions found')
    }
    
    // Generate NEW sample transactions
    console.log('📊 Generating NEW sample transactions...')
    const sampleTransactions = await generateSampleTransactions(testUserId)
    console.log(`   Generated ${sampleTransactions.length} new transactions`)
    
    // Insert transactions in batches
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < sampleTransactions.length; i += batchSize) {
      const batch = sampleTransactions.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(batch)
        .select('id')
      
      if (error) {
        throw new Error(`Failed to insert batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      }
      
      insertedCount += data.length
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sampleTransactions.length / batchSize)} (${insertedCount}/${sampleTransactions.length} transactions)`)
    }
    
    // Get final count
    const { data: finalTransactions, error: finalError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', testUserId)
    
    if (finalError) {
      console.warn('⚠️  Could not get final transaction count')
    }
    
    console.log('\n🎉 SAFE transaction population completed successfully!')
    console.log(`   New transactions added: ${insertedCount}`)
    console.log(`   Total transactions now: ${finalTransactions?.length || 'unknown'}`)
    console.log(`   User ID: ${testUserId}`)
    
    console.log('\n✅ Your existing data has been preserved!')
    console.log('\nNext steps:')
    console.log('1. Refresh your browser or restart the dev server')
    console.log('2. Navigate to /spending/cashflow')
    console.log('3. You should see both old and new transaction data!')
    
  } catch (error) {
    console.error('\n💥 Failed to populate transactions safely:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  populateTransactionsSafe()
}

module.exports = { populateTransactionsSafe, backupExistingTransactions }