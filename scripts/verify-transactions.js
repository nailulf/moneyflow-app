#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local')
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

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifyTransactions() {
  console.log('🔍 Verifying generated transactions...\n')
  
  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, amount, type, account_id')
    .eq('user_id', testUserId)
    .limit(10)
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log('📊 Sample transactions:')
  data.forEach((t, index) => {
    console.log(`${index + 1}. ${t.description}`)
    console.log(`   Amount: IDR ${t.amount.toLocaleString('id-ID')} (${t.type})`)
    console.log(`   Account ID: ${t.account_id ? '✅ Present' : '❌ Missing'}`)
    console.log(`   Amount >= 500: ${t.amount >= 500 ? '✅ Yes' : '❌ No'}`)
    console.log(`   Amount positive: ${t.amount > 0 ? '✅ Yes' : '❌ No'}`)
    console.log('')
  })
  
  // Check statistics
  const { data: stats } = await supabase
    .from('transactions')
    .select('amount, type, account_id')
    .eq('user_id', testUserId)
  
  const withAccountId = stats.filter(t => t.account_id).length
  const minAmount = Math.min(...stats.map(t => t.amount))
  const allPositive = stats.every(t => t.amount > 0)
  
  console.log('📈 Statistics:')
  console.log(`   Total transactions: ${stats.length}`)
  console.log(`   With account_id: ${withAccountId}/${stats.length} (${((withAccountId/stats.length)*100).toFixed(1)}%)`)
  console.log(`   Minimum amount: IDR ${minAmount.toLocaleString('id-ID')}`)
  console.log(`   All amounts positive: ${allPositive ? '✅ Yes' : '❌ No'}`)
  console.log(`   All amounts >= 500: ${minAmount >= 500 ? '✅ Yes' : '❌ No'}`)
}

verifyTransactions()