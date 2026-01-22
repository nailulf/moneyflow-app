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

async function checkRecurringTransactions() {
  console.log('\n🔄 Checking for pending recurring transactions...')
  console.log('Current Time:', new Date().toISOString())

  const now = new Date()
  now.setHours(12, 0, 0, 0)

  const { data: recurringTransactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true)

  if (error) {
    console.error('❌ Error fetching recurring transactions:', error)
    return
  }

  console.log(`Found ${recurringTransactions.length} recurring transactions configuration(s).`)

  const pending = []

  for (const transaction of recurringTransactions) {
    // Check end date
    if (transaction.recurring_end_date) {
      const endDate = new Date(transaction.recurring_end_date)
      endDate.setHours(23, 59, 59, 999)
      if (now > endDate) continue
    }

    const frequency = transaction.recurring_frequency || 'monthly'
    const originalDate = new Date(transaction.date)
    originalDate.setHours(12, 0, 0, 0)

    const lastProcessed = transaction.last_processed_date
      ? new Date(transaction.last_processed_date)
      : new Date(transaction.date)
    lastProcessed.setHours(12, 0, 0, 0)

    // Skip if already processed today
    if (lastProcessed.getTime() === now.getTime()) continue

    let shouldRun = false

    if (frequency === 'daily') {
      if (now >= originalDate) shouldRun = true
    } else if (frequency === 'weekly') {
      const daysSinceLastRun = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24)
      if (now.getDay() === originalDate.getDay() && daysSinceLastRun >= 6) {
        shouldRun = true
      }
    } else if (frequency === 'monthly') {
      if (now.getDate() === originalDate.getDate()) {
        const isSameMonthAsLast = lastProcessed.getMonth() === now.getMonth() && lastProcessed.getFullYear() === now.getFullYear()
        if (!isSameMonthAsLast) shouldRun = true
      }
    } else if (frequency === 'yearly') {
      if (now.getDate() === originalDate.getDate() && now.getMonth() === originalDate.getMonth()) {
        const isSameYearAsLast = lastProcessed.getFullYear() === now.getFullYear()
        if (!isSameYearAsLast) shouldRun = true
      }
    }

    if (shouldRun) {
      pending.push({
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        frequency: frequency,
        lastProcessed: lastProcessed.toISOString().split('T')[0],
        nextRun: now.toISOString().split('T')[0]
      })
    }
  }

  if (pending.length > 0) {
    console.log('\n⚠️  Pending Transactions (Planned for Today):')
    console.table(pending)
  } else {
    console.log('\n✅ No transactions pending for today.')
  }
}

// Run both
(async () => {
  await verifyTransactions()
  await checkRecurringTransactions()
})()