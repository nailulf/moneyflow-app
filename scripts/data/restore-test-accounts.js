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

async function restoreAccounts() {
  console.log(`🚀 Restoring accounts for user: ${testUserId}`)

  const accountsToCreate = [
    {
      name: 'Cash Wallet',
      type: 'CASH',
      balance: 1500000,
      currency: 'IDR',
      is_default: false,
      is_active: true
    },
    {
      name: 'BCA Credit Card',
      type: 'CREDIT_CARD',
      balance: -2500000,
      currency: 'IDR',
      is_default: false,
      is_active: true
    },
    {
      name: 'Stock Portfolio',
      type: 'INVESTMENT',
      balance: 25000000,
      currency: 'IDR',
      is_default: false,
      is_active: true
    },
    {
      name: 'Emergency Fund',
      type: 'BANK',
      balance: 50000000,
      currency: 'IDR',
      is_default: false,
      is_active: true
    }
  ]

  for (const account of accountsToCreate) {
    // Check if account with same name exists
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', testUserId)
      .eq('name', account.name)
      .single()

    if (existing) {
      console.log(`✅ Account '${account.name}' already exists`)
    } else {
      console.log(`➕ Creating account '${account.name}'...`)
      const { error } = await supabase
        .from('accounts')
        .insert({
          ...account,
          user_id: testUserId
        })

      if (error) {
        console.error(`❌ Failed to create '${account.name}':`, error.message)
      } else {
        console.log(`✅ Created '${account.name}'`)
      }
    }
  }

  // Verify final list
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', testUserId)
    .order('name')

  console.log('\n💰 Final Account List:')
  console.table(allAccounts.map(a => ({
    name: a.name,
    type: a.type,
    balance: a.balance,
    currency: a.currency
  })))
}

restoreAccounts()
