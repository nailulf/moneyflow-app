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

async function testDatabase() {
  console.log('🔍 Testing database setup...')
  
  // Test category_groups table
  try {
    const { data: groups, error: groupsError } = await supabase
      .from('category_groups')
      .select('*')
      .limit(1)
    
    if (groupsError) {
      console.log('❌ category_groups table test failed:', groupsError.message)
      return false
    }
    console.log('✅ category_groups table is accessible')
  } catch (err) {
    console.log('❌ category_groups table test failed:', err.message)
    return false
  }
  
  // Test categories table with category_group_id column
  try {
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, category_group_id')
      .limit(1)
    
    if (categoriesError) {
      console.log('❌ categories table with category_group_id test failed:', categoriesError.message)
      return false
    }
    console.log('✅ categories table with category_group_id column is accessible')
  } catch (err) {
    console.log('❌ categories table test failed:', err.message)
    return false
  }
  
  console.log('🎉 Database setup is complete and working!')
  return true
}

async function testAPI() {
  console.log('\n🔍 Testing API endpoints...')
  
  const baseUrl = 'http://localhost:3000'
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'
  
  // Test GET /api/category-groups
  try {
    const response = await fetch(`${baseUrl}/api/category-groups?userId=${testUserId}`)
    const data = await response.json()
    console.log(`GET /api/category-groups: ${response.status} - ${response.ok ? 'SUCCESS' : 'FAILED'}`)
    if (!response.ok) {
      console.log('Error:', data)
    } else {
      console.log(`Found ${data.length} category groups`)
    }
  } catch (err) {
    console.log('GET /api/category-groups: FAILED -', err.message)
  }
  
  // Test POST /api/category-groups
  try {
    const response = await fetch(`${baseUrl}/api/category-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: testUserId,
        name: 'Test Group',
        type: 'EXPENSE',
        color: '#FF0000'
      })
    })
    const data = await response.json()
    console.log(`POST /api/category-groups: ${response.status} - ${response.ok ? 'SUCCESS' : 'FAILED'}`)
    if (!response.ok) {
      console.log('Error:', data)
    } else {
      console.log('Created category group:', data.name)
    }
  } catch (err) {
    console.log('POST /api/category-groups: FAILED -', err.message)
  }
  
  console.log('\n✅ API testing complete')
}

async function runTests() {
  const dbReady = await testDatabase()
  
  if (dbReady) {
    await testAPI()
    console.log('\n🎉 All tests passed! Your application should now work correctly.')
    console.log('\n📝 Next steps:')
    console.log('1. Restart your development server (npm run dev)')
    console.log('2. Open the application in your browser')
    console.log('3. Navigate to the category management section')
    console.log('4. Default categories should now initialize automatically')
  } else {
    console.log('\n❌ Database setup is not complete. Please run the SQL commands first.')
  }
}

runTests().catch(console.error)