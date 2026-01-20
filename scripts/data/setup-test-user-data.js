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
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupTestData() {
  console.log(`🚀 Setting up data for user: ${testUserId}`)

  // 1. Setup Accounts
  console.log('\n🏦 Setting up accounts...')
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', testUserId)

  let accountId

  if (accounts && accounts.length > 0) {
    console.log('✅ Account already exists')
    accountId = accounts[0].id
  } else {
    const { data: newAccount, error: createAccountError } = await supabase
      .from('accounts')
      .insert({
        user_id: testUserId,
        name: 'Main Bank Account',
        type: 'BANK',
        balance: 5000000,
        currency: 'IDR',
        is_default: true,
        is_active: true
      })
      .select()
      .single()

    if (createAccountError) {
      console.error('❌ Failed to create account:', createAccountError)
      process.exit(1)
    }
    console.log('✅ Created default account')
    accountId = newAccount.id
  }

  // 2. Setup Categories
  console.log('\nqx Setting up categories...')
  
  // Create Category Groups
  const groups = [
    { name: 'Expenses', type: 'EXPENSE', color: '#FF6B6B' },
    { name: 'Income', type: 'INCOME', color: '#82E0AA' },
    { name: 'Transfer', type: 'TRANSFER', color: '#9CA3AF' }
  ]

  const groupMap = {}

  for (const group of groups) {
    // Check if exists
    const { data: existingGroup, error: findError } = await supabase
      .from('category_groups')
      .select('id')
      .eq('user_id', testUserId)
      .eq('type', group.type)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      console.log('Error finding group:', findError)
    }

    if (existingGroup) {
      console.log(`✅ Group ${group.name} already exists`)
      groupMap[group.type] = existingGroup.id
    } else {
      const { data: newGroup, error } = await supabase
        .from('category_groups')
        .insert({
          user_id: testUserId,
          name: group.name,
          type: group.type,
          color: group.color,
          is_active: true,
          sort_order: 1
        })
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Failed to create group ${group.name}:`, error)
      } else {
        groupMap[group.type] = newGroup.id
      }
    }
  }

  // Create Categories
  const defaultCategories = [
    { name: 'Food & Dining', color: '#FF6B6B', type: 'EXPENSE' },
    { name: 'Transportation', color: '#4ECDC4', type: 'EXPENSE' },
    { name: 'Shopping', color: '#45B7D1', type: 'EXPENSE' },
    { name: 'Salary', color: '#82E0AA', type: 'INCOME' },
    { name: 'Bank Transfer', color: '#9CA3AF', type: 'TRANSFER' }
  ]

  const categoryMap = {}

  for (const cat of defaultCategories) {
    const groupId = groupMap[cat.type]
    if (!groupId) continue

    const { data: existingCat } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', testUserId)
      .eq('name', cat.name)
      .single()

    if (existingCat) {
      categoryMap[cat.name] = existingCat.id
    } else {
      const { data: newCat, error } = await supabase
        .from('categories')
        .insert({
          user_id: testUserId,
          name: cat.name,
          color: cat.color,
          group_type: cat.type,
          category_group_id: groupId,
          is_custom: false,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Failed to create category ${cat.name}:`, error)
      } else {
        categoryMap[cat.name] = newCat.id
      }
    }
  }

  // 3. Setup Sample Transactions
  console.log('\n💸 Setting up sample transactions...')
  
  // Check if we already have transactions
  const { count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', testUserId)

  if (count > 0) {
    console.log(`✅ User already has ${count} transactions`)
  } else {
    const transactions = []
    const today = new Date()
    
    // Generate some transactions for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // Random expense
      if (Math.random() > 0.3) {
        transactions.push({
          user_id: testUserId,
          account_id: accountId,
          category_id: categoryMap['Food & Dining'],
          amount: Math.floor(Math.random() * 50000) + 10000,
          type: 'EXPENSE',
          description: 'Lunch',
          date: dateStr
        })
      }

      // Salary once a month
      if (i === 1) {
        transactions.push({
          user_id: testUserId,
          account_id: accountId,
          category_id: categoryMap['Salary'],
          amount: 10000000,
          type: 'INCOME',
          description: 'Monthly Salary',
          date: dateStr
        })
      }
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert(transactions)

    if (txError) {
      console.error('❌ Failed to create transactions:', txError)
    } else {
      console.log(`✅ Created ${transactions.length} sample transactions`)
    }
  }

  console.log('\n🎉 Test data setup complete!')
}

setupTestData()
