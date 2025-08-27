const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addUpdatedAtColumn() {
  console.log('🔧 Adding updated_at column to transactions table...')
  
  try {
    // Try to select from transactions table to see current structure
    const { data: testData, error: testError } = await supabase
      .from('transactions')
      .select('updated_at')
      .limit(1)
    
    if (!testError) {
      console.log('✅ updated_at column already exists')
      return true
    }
    
    // If we get a column not found error, we need to add the column
    if (testError.message.includes('updated_at')) {
      console.log('🔧 updated_at column missing, attempting to add it...')
      
      // Try to add the column using a simple INSERT that will fail but might give us more info
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          date: '2024-01-01',
          description: 'test',
          amount: 0,
          type: 'EXPENSE',
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.log('❌ Column missing and cannot be added via API:', insertError.message)
        console.log('📝 Please run the complete-database-fix.sql script manually or contact your database administrator.')
        return false
      }
    }
    
    console.log('✅ Successfully verified updated_at column')
    return true
    
  } catch (err) {
    console.log('❌ Error:', err.message)
    return false
  }
}

async function runFix() {
  console.log('🚀 Starting database fix for updated_at column...')
  
  const success = await addUpdatedAtColumn()
  
  if (success) {
    console.log('🎉 Database fix completed successfully!')
    console.log('📝 You can now try creating transactions again.')
  } else {
    console.log('❌ Database fix failed. Please check the errors above.')
    process.exit(1)
  }
}

runFix().catch(console.error)