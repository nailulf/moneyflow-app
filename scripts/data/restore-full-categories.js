
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function restoreFullCategories() {
  console.log(`Restoring categories for user: ${testUserId}`)

  // 1. Ensure Groups Exist
  const groups = [
    { name: 'Income', type: 'INCOME', color: '#10B981' },
    { name: 'Expenses', type: 'EXPENSE', color: '#EF4444' },
    { name: 'Transfer', type: 'TRANSFER', color: '#6B7280' }
  ]

  const groupIds = {}

  for (const group of groups) {
    // Check if exists
    const { data: existing } = await supabase
      .from('category_groups')
      .select('id')
      .eq('user_id', testUserId)
      .eq('type', group.type)
      .single()

    if (existing) {
      groupIds[group.type] = existing.id
      console.log(`✅ Group exists: ${group.name}`)
    } else {
      const { data: created, error } = await supabase
        .from('category_groups')
        .insert({
          user_id: testUserId,
          name: group.name,
          type: group.type,
          color: group.color
        })
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Failed to create group ${group.name}:`, error)
      } else {
        groupIds[group.type] = created.id
        console.log(`✅ Created group: ${group.name}`)
      }
    }
  }

  // 2. Ensure Categories Exist
  const categories = [
    // Income
    { name: 'Salary', type: 'INCOME', color: '#10B981' },
    { name: 'Investment', type: 'INCOME', color: '#34D399' },
    { name: 'Freelance', type: 'INCOME', color: '#6EE7B7' },
    { name: 'Gift', type: 'INCOME', color: '#A7F3D0' },
    { name: 'Other Income', type: 'INCOME', color: '#D1FAE5' },
    
    // Expenses
    { name: 'Food & Dining', type: 'EXPENSE', color: '#EF4444' },
    { name: 'Groceries', type: 'EXPENSE', color: '#F87171' },
    { name: 'Transportation', type: 'EXPENSE', color: '#FCA5A5' },
    { name: 'Shopping', type: 'EXPENSE', color: '#FECACA' },
    { name: 'Housing', type: 'EXPENSE', color: '#B91C1C' },
    { name: 'Bills & Utilities', type: 'EXPENSE', color: '#DC2626' },
    { name: 'Health & Fitness', type: 'EXPENSE', color: '#EA580C' },
    { name: 'Entertainment', type: 'EXPENSE', color: '#F97316' },
    { name: 'Education', type: 'EXPENSE', color: '#FB923C' },
    { name: 'Personal Care', type: 'EXPENSE', color: '#FDBA74' },
    { name: 'Travel', type: 'EXPENSE', color: '#FED7AA' },
    
    // Transfer
    { name: 'Bank Transfer', type: 'TRANSFER', color: '#6B7280' }
  ]

  for (const cat of categories) {
    // Check if exists (by name and type)
    const { data: existing } = await supabase
      .from('categories')
      .select('id, category_group_id')
      .eq('user_id', testUserId)
      .eq('name', cat.name)
      .eq('group_type', cat.type)
      .single()

    if (existing) {
      if (!existing.category_group_id && groupIds[cat.type]) {
        // Fix missing group link
        await supabase
          .from('categories')
          .update({ category_group_id: groupIds[cat.type] })
          .eq('id', existing.id)
        console.log(`✅ Category exists (Updated Group Link): ${cat.name}`)
      } else {
        console.log(`✅ Category exists: ${cat.name}`)
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: testUserId,
          name: cat.name,
          group_type: cat.type,
          color: cat.color,
          category_group_id: groupIds[cat.type],
          is_custom: false
        })
      
      if (error) {
        console.error(`❌ Failed to create category ${cat.name}:`, error)
      } else {
        console.log(`✅ Created category: ${cat.name}`)
      }
    }
  }
}

restoreFullCategories()
