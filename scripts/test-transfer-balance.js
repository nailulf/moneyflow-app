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

async function testTransferBalance() {
  console.log('🧪 Testing TRANSFER Balance Update Logic')

  // 1. Get a test account (Cash Wallet)
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', testUserId)
    .eq('type', 'CASH')
    .single()

  if (accError || !account) {
    console.error('❌ Failed to get test account:', accError)
    return
  }

  const initialBalance = account.balance
  console.log(`Initial Balance for ${account.name}: ${initialBalance}`)

  // 2. Insert a TRANSFER transaction
  const transferAmount = 75000
  console.log(`\n💸 Inserting TRANSFER of ${transferAmount}...`)
  
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: testUserId,
      account_id: account.id,
      category_id: null,
      amount: transferAmount,
      type: 'TRANSFER',
      description: 'Trigger Test Transfer',
      date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (txError) {
    console.error('❌ Failed to insert transaction:', txError)
    return
  }

  // 3. Check Balance (Should be Initial - 75000 if logic works, or Initial if ignored)
  const { data: accountAfterTransfer } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', account.id)
    .single()

  const expectedIfWorking = initialBalance - transferAmount
  const expectedIfIgnored = initialBalance
  
  console.log(`Balance after Transfer: ${accountAfterTransfer.balance}`)
  console.log(`Expected (if working): ${expectedIfWorking}`)
  console.log(`Expected (if ignored): ${expectedIfIgnored}`)

  if (Number(accountAfterTransfer.balance) === expectedIfWorking) {
    console.log('✅ Transfer DECREASED balance (Good)')
  } else if (Number(accountAfterTransfer.balance) === Number(expectedIfIgnored)) {
    console.error('❌ Transfer IGNORED (Bad - unless intentional)')
  } else {
    console.error('❓ Unexpected balance change')
  }

  // Cleanup
  await supabase.from('transactions').delete().eq('id', tx.id)
}

testTransferBalance()
