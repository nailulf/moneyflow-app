#!/usr/bin/env node

/**
 * Script to populate sample transactions for the test user
 * This will create realistic transaction data for testing the cashflow chart
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

// Sample transactions data
async function generateSampleTransactions(userId) {
  const transactions = []
  
  // Fetch actual categories from database
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, group_type')
    .eq('user_id', userId)
    .eq('is_active', true)
  
  if (error || !categories || categories.length === 0) {
    console.error('❌ Failed to fetch categories:', error)
    throw new Error('No categories found. Please run initialize-categories.js first.')
  }
  
  console.log(`📋 Found ${categories.length} categories:`, categories.map(c => c.name).join(', '))
  
  // Fetch actual accounts from database
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, type, is_default')
    .eq('user_id', userId)
    .eq('is_active', true)
  
  if (accountsError || !accounts || accounts.length === 0) {
    console.error('❌ Failed to fetch accounts:', accountsError)
    throw new Error('No accounts found. Please create accounts first.')
  }
  
  console.log(`🏦 Found ${accounts.length} accounts:`, accounts.map(a => a.name).join(', '))
  
  // Get default account or first account
  const defaultAccount = accounts.find(a => a.is_default) || accounts[0]
  
  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.group_type === 'INCOME')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')
  
  // Generate transactions for January through September 2025
  for (let month = 0; month < 9; month++) {
    const date = new Date(2025, month, 1) // Start with January 2025 (month 0)
    
    // Add monthly salary
    if (incomeCategories.length > 0) {
      const salaryCategory = incomeCategories.find(c => c.name === 'Salary') || incomeCategories[0]
      transactions.push({
        user_id: userId,
        account_id: defaultAccount.id,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-15`,
        description: 'Monthly Salary',
        amount: Math.abs(8000000 + Math.random() * 4000000), // IDR 8,000,000-12,000,000 (positive)
        type: 'INCOME',
        category_id: salaryCategory.id,
        merchant: 'Company Inc',
        notes: 'Regular monthly salary',
        tags: ['salary', 'monthly'],
        is_recurring: false
      })
    }
    
    // Add freelance income occasionally
    if (Math.random() > 0.6 && incomeCategories.length > 0) {
      const freelanceCategory = incomeCategories.find(c => c.name === 'Investment') || incomeCategories[0]
      transactions.push({
        user_id: userId,
        account_id: defaultAccount.id,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        description: 'Freelance Project',
        amount: Math.abs(1000000 + Math.random() * 3000000), // IDR 1,000,000-4,000,000 (positive)
        type: 'INCOME',
        category_id: freelanceCategory.id,
        merchant: 'Client',
        notes: 'Freelance work',
        tags: ['freelance'],
        is_recurring: false
      })
    }
    
    // Add random expenses throughout the month
    for (let i = 0; i < 20; i++) {
      const expenseDate = new Date(date)
      expenseDate.setDate(Math.floor(Math.random() * 28) + 1)
      
      if (expenseCategories.length === 0) continue
      
      const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      // Generate positive IDR amounts with minimum 500 IDR, range 500-500,000 IDR
      const amount = Math.abs(Math.max(500, Math.random() * 500000))
      
      const merchants = {
        'Food & Dining': ['McDonald\'s', 'Starbucks', 'Local Restaurant', 'Pizza Hut'],
        'Transportation': ['Uber', 'Gas Station', 'Public Transit', 'Parking'],
        'Shopping': ['Amazon', 'Target', 'Walmart', 'Best Buy'],
        'Entertainment': ['Netflix', 'Spotify', 'Movie Theater', 'Concert'],
        'Bills & Utilities': ['Electric Company', 'Internet Provider', 'Phone Bill', 'Water Company'],
        'Healthcare': ['Pharmacy', 'Doctor Visit', 'Dentist', 'Insurance'],
        'Travel': ['Airline', 'Hotel', 'Car Rental', 'Travel Agency'],
        'Education': ['Bookstore', 'Online Course', 'University', 'Training'],
        'Groceries': ['Whole Foods', 'Safeway', 'Trader Joe\'s', 'Local Market'],
        'Gas': ['Shell', 'Chevron', 'BP', 'Exxon']
      }
      
      const merchantList = merchants[category.name] || ['Various']
      const merchant = merchantList[Math.floor(Math.random() * merchantList.length)]
      
      transactions.push({
        user_id: userId,
        account_id: defaultAccount.id,
        date: expenseDate.toISOString().split('T')[0],
        description: `${category.name} - ${merchant}`,
        amount: amount,
        type: 'EXPENSE',
        category_id: category.id,
        merchant: merchant,
        notes: null,
        tags: [category.name.toLowerCase().replace(' & ', '-').replace(' ', '-')],
        is_recurring: false
      })
    }
    
    // Add transfer transactions
    if (transferCategories.length > 0) {
      // Monthly savings transfer
      const savingsCategory = transferCategories.find(c => c.name === 'Bank Transfer') || transferCategories[0]
      transactions.push({
        user_id: userId,
        account_id: defaultAccount.id,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 5) + 25).padStart(2, '0')}`,
        description: 'Monthly Savings Transfer',
        amount: Math.abs(1500000 + Math.random() * 1000000), // IDR 1,500,000-2,500,000 (positive)
        type: 'TRANSFER',
        category_id: savingsCategory.id,
        merchant: 'Savings Account',
        notes: 'Monthly savings',
        tags: ['savings', 'transfer'],
        is_recurring: false
      })
      
      // Investment transfer (occasionally)
      if (Math.random() > 0.5) {
        const investmentCategory = transferCategories.find(c => c.name === 'Investment') || transferCategories[0]
        transactions.push({
          user_id: userId,
          account_id: defaultAccount.id,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10) + 10).padStart(2, '0')}`,
          description: 'Investment Transfer',
          amount: Math.abs(1000000 + Math.random() * 2000000), // IDR 1,000,000-3,000,000 (positive)
          type: 'TRANSFER',
          category_id: investmentCategory.id,
          merchant: 'Investment Account',
          notes: 'Monthly investment',
          tags: ['investment', 'transfer'],
          is_recurring: false
        })
      }
    }
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

async function populateTransactions() {
  console.log('🚀 MoneyFlow 2025 Transaction Population Script')
  console.log('===============================================')
  console.log('📅 Adding transactions for January - September 2025')
  console.log('💾 Preserving existing transactions from other periods\n')
  
  try {
    // Check if 2025 transactions already exist
    const { data: existing2025Transactions, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', testUserId)
      .gte('date', '2025-01-01')
      .lte('date', '2025-09-30')
      .limit(1)
    
    if (checkError) {
      throw new Error(`Failed to check existing 2025 transactions: ${checkError.message}`)
    }
    
    if (existing2025Transactions && existing2025Transactions.length > 0) {
      console.log('⚠️  2025 transactions already exist for this user')
      console.log('   Clearing existing 2025 transactions (Jan-Sep) first...')
      
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', testUserId)
        .gte('date', '2025-01-01')
        .lte('date', '2025-09-30')
      
      if (deleteError) {
        throw new Error(`Failed to clear existing 2025 transactions: ${deleteError.message}`)
      }
      
      console.log('✅ Existing 2025 transactions cleared')
    }
    
    // Generate sample transactions for 2025
    console.log('📊 Generating 2025 sample transactions (Jan-Sep)...')
    const sampleTransactions = await generateSampleTransactions(testUserId)
    console.log(`   Generated ${sampleTransactions.length} transactions for 2025`)
    
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
    
    console.log('\n🎉 2025 transactions populated successfully!')
    console.log(`   Total 2025 transactions created: ${insertedCount}`)
    console.log(`   Period: January - September 2025`)
    console.log(`   User ID: ${testUserId}`)
    
    // Calculate summary for 2025 transactions
    const totalIncome = sampleTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = Math.abs(
      sampleTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
    )
    
    console.log('\n📈 2025 Transaction Summary (Jan-Sep):')
    console.log(`   Total Income: IDR ${totalIncome.toLocaleString('id-ID')}`)
    console.log(`   Total Expenses: IDR ${totalExpenses.toLocaleString('id-ID')}`)
    console.log(`   Net Cash Flow: IDR ${(totalIncome - totalExpenses).toLocaleString('id-ID')}`)
    
    console.log('\nNext steps:')
    console.log('1. Refresh your browser or restart the dev server')
    console.log('2. Navigate to /spending to see updated charts')
    console.log('3. You should now see data for both 2024 and 2025!')
    
  } catch (error) {
    console.error('\n💥 Failed to populate transactions:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  populateTransactions()
}

module.exports = { populateTransactions, generateSampleTransactions }