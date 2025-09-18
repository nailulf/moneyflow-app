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
  
  const expenseCategories = categories.filter(c => c.group_type === 'EXPENSE')
  const incomeCategories = categories.filter(c => c.group_type === 'INCOME')
  const transferCategories = categories.filter(c => c.group_type === 'TRANSFER')
  
  // Generate transactions for the last 6 months
  for (let month = 0; month < 6; month++) {
    const date = new Date()
    date.setMonth(date.getMonth() - month)
    
    // Add monthly salary
    if (incomeCategories.length > 0) {
      const salaryCategory = incomeCategories.find(c => c.name === 'Salary') || incomeCategories[0]
      transactions.push({
        user_id: userId,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-15`,
        description: 'Monthly Salary',
        amount: 5000 + Math.random() * 1000, // $5000-6000
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
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        description: 'Freelance Project',
        amount: 500 + Math.random() * 1500, // $500-2000
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
      const amount = -(Math.random() * 300 + 10) // $10-310 expenses
      
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
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 5) + 25).padStart(2, '0')}`,
        description: 'Monthly Savings Transfer',
        amount: -(800 + Math.random() * 400), // $800-1200 transfer
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
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10) + 10).padStart(2, '0')}`,
          description: 'Investment Transfer',
          amount: -(500 + Math.random() * 1000), // $500-1500 investment
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
  console.log('🚀 MoneyFlow Sample Transaction Population Script')
  console.log('===============================================\n')
  
  try {
    // Check if transactions already exist
    const { data: existingTransactions, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1)
    
    if (checkError) {
      throw new Error(`Failed to check existing transactions: ${checkError.message}`)
    }
    
    if (existingTransactions && existingTransactions.length > 0) {
      console.log('⚠️  Transactions already exist for this user')
      console.log('   Clearing existing transactions first...')
      
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', testUserId)
      
      if (deleteError) {
        throw new Error(`Failed to clear existing transactions: ${deleteError.message}`)
      }
      
      console.log('✅ Existing transactions cleared')
    }
    
    // Generate sample transactions
    console.log('📊 Generating sample transactions...')
    const sampleTransactions = await generateSampleTransactions(testUserId)
    console.log(`   Generated ${sampleTransactions.length} transactions`)
    
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
    
    console.log('\n🎉 Sample transactions populated successfully!')
    console.log(`   Total transactions created: ${insertedCount}`)
    console.log(`   User ID: ${testUserId}`)
    
    // Calculate summary
    const totalIncome = sampleTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = Math.abs(
      sampleTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0)
    )
    
    console.log('\n📈 Transaction Summary:')
    console.log(`   Total Income: $${totalIncome.toFixed(2)}`)
    console.log(`   Total Expenses: $${totalExpenses.toFixed(2)}`)
    console.log(`   Net Cash Flow: $${(totalIncome - totalExpenses).toFixed(2)}`)
    
    console.log('\nNext steps:')
    console.log('1. Refresh your browser or restart the dev server')
    console.log('2. Navigate to /spending/cashflow')
    console.log('3. You should now see the cash flow chart with data!')
    
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