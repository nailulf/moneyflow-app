#!/usr/bin/env node

/**
 * Script to verify that transactions were generated for 2024
 */

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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verify2024Transactions() {
  console.log('🔍 Verifying 2024 transactions...\n')
  
  try {
    // Fetch all transactions for the test user
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, date, description, amount, type')
      .eq('user_id', testUserId)
      .order('date', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`)
    }
    
    if (!transactions || transactions.length === 0) {
      console.log('❌ No transactions found')
      return
    }
    
    console.log(`📊 Found ${transactions.length} transactions`)
    
    // Check date ranges
    const dates = transactions.map(t => new Date(t.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    
    console.log(`📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`)
    
    // Check if all dates are in 2024
    const transactionsIn2024 = transactions.filter(t => {
      const year = new Date(t.date).getFullYear()
      return year === 2024
    })
    
    console.log(`🗓️  Transactions in 2024: ${transactionsIn2024.length}/${transactions.length}`)
    
    if (transactionsIn2024.length === transactions.length) {
      console.log('✅ All transactions are from 2024!')
    } else {
      console.log('❌ Some transactions are not from 2024')
      
      // Show non-2024 transactions
      const nonTwentyTwentyFour = transactions.filter(t => {
        const year = new Date(t.date).getFullYear()
        return year !== 2024
      })
      
      console.log('\n🚨 Non-2024 transactions:')
      nonTwentyTwentyFour.slice(0, 5).forEach((t, i) => {
        console.log(`${i + 1}. ${t.description} - ${t.date} (${new Date(t.date).getFullYear()})`)
      })
    }
    
    // Show monthly distribution
    const monthlyCount = {}
    transactionsIn2024.forEach(t => {
      const month = new Date(t.date).getMonth() + 1 // 1-12
      monthlyCount[month] = (monthlyCount[month] || 0) + 1
    })
    
    console.log('\n📈 Monthly distribution in 2024:')
    for (let month = 1; month <= 12; month++) {
      const monthName = new Date(2024, month - 1, 1).toLocaleString('default', { month: 'long' })
      const count = monthlyCount[month] || 0
      console.log(`   ${monthName}: ${count} transactions`)
    }
    
    // Show sample transactions from different months
    console.log('\n📋 Sample transactions by month:')
    for (let month = 1; month <= 12; month++) {
      const monthTransactions = transactionsIn2024.filter(t => {
        return new Date(t.date).getMonth() + 1 === month
      })
      
      if (monthTransactions.length > 0) {
        const sample = monthTransactions[0]
        const monthName = new Date(2024, month - 1, 1).toLocaleString('default', { month: 'short' })
        console.log(`   ${monthName} 2024: ${sample.description} - ${sample.date}`)
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message)
    process.exit(1)
  }
}

// Run the verification
if (require.main === module) {
  verify2024Transactions()
}