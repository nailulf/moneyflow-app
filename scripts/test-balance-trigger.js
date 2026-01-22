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

async function testBalanceTrigger() {
  console.log('🧪 Testing Account Balance Trigger Logic')

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

  // 2. Insert an EXPENSE transaction
  const expenseAmount = 50000
  console.log(`\n💸 Inserting EXPENSE of ${expenseAmount}...`)
  
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: testUserId,
      account_id: account.id,
      category_id: null, // Skipping category for this test
      amount: expenseAmount,
      type: 'EXPENSE',
      description: 'Trigger Test Expense',
      date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (txError) {
    console.error('❌ Failed to insert transaction:', txError)
    return
  }

  // 3. Check Balance (Should be Initial - 50000)
  const { data: accountAfterExpense } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', account.id)
    .single()

  const expectedAfterExpense = initialBalance - expenseAmount
  console.log(`Balance after Expense: ${accountAfterExpense.balance} (Expected: ${expectedAfterExpense})`)

  if (Number(accountAfterExpense.balance) === expectedAfterExpense) {
    console.log('✅ Expense trigger worked correctly')
  } else {
    console.error('❌ Expense trigger FAILED')
  }

  // 4. Update the transaction (Change amount to 100000)
  const newExpenseAmount = 100000
  console.log(`\n🔄 Updating EXPENSE amount to ${newExpenseAmount}...`)

  const { error: updateError } = await supabase
    .from('transactions')
    .update({ amount: newExpenseAmount })
    .eq('id', tx.id)

  if (updateError) {
    console.error('❌ Failed to update transaction:', updateError)
    return
  }

  // 5. Check Balance (Should be Initial - 100000)
  const { data: accountAfterUpdate } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', account.id)
    .single()

  const expectedAfterUpdate = initialBalance - newExpenseAmount
  console.log(`Balance after Update: ${accountAfterUpdate.balance} (Expected: ${expectedAfterUpdate})`)

  if (Number(accountAfterUpdate.balance) === expectedAfterUpdate) {
    console.log('✅ Update trigger worked correctly')
  } else {
    console.error('❌ Update trigger FAILED')
  }

  // 6. Delete the transaction
  console.log('\n🗑️ Deleting transaction...')
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', tx.id)

  if (deleteError) {
    console.error('❌ Failed to delete transaction:', deleteError)
    return
  }

  // 7. Check Balance (Should return to Initial)
  const { data: accountFinal } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', account.id)
    .single()

  console.log(`Final Balance: ${accountFinal.balance} (Expected: ${initialBalance})`)

  if (Number(accountFinal.balance) === Number(initialBalance)) {
    console.log('✅ Delete trigger worked correctly')
  } else {
    console.error('❌ Delete trigger FAILED')
  }
}

testBalanceTrigger()
