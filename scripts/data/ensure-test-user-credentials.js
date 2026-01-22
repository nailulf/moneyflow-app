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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function ensureTestUser() {
  console.log('🔍 Checking for test@moneyflow.com...')
  
  const email = 'test@moneyflow.com'
  const password = 'test123456'

  // List users to find by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Error listing users:', listError)
    process.exit(1)
  }

  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    console.log(`✅ User found: ${existingUser.id}`)
    console.log('🔄 Updating password...')
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: password }
    )

    if (updateError) {
      console.error('❌ Failed to update password:', updateError)
    } else {
      console.log('✅ Password updated successfully')
    }
  } else {
    console.log('👤 Creating new test user...')
    
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: 'Test User',
        role: 'test'
      }
    })

    if (createError) {
      console.error('❌ Failed to create user:', createError)
    } else {
      console.log(`✅ User created successfully: ${data.user.id}`)
    }
  }
}

ensureTestUser()
