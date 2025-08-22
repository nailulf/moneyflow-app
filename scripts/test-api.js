// Test API endpoints
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const BASE_URL = 'http://localhost:3000';
const USER_ID = envVars.NEXT_PUBLIC_TEST_USER_ID || 'test-user-123';

async function testAPI() {
  console.log('🧪 Testing API endpoints...');
  console.log(`Using USER_ID: ${USER_ID}`);
  
  try {
    // Test category groups GET
    console.log('\n1. Testing GET /api/category-groups');
    const groupsResponse = await fetch(`${BASE_URL}/api/category-groups?userId=${USER_ID}`);
    const groupsData = await groupsResponse.json();
    console.log('Status:', groupsResponse.status);
    console.log('Response:', JSON.stringify(groupsData, null, 2));
    
    // Test categories GET
    console.log('\n2. Testing GET /api/categories');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories?userId=${USER_ID}`);
    const categoriesData = await categoriesResponse.json();
    console.log('Status:', categoriesResponse.status);
    console.log('Response:', JSON.stringify(categoriesData, null, 2));
    
    // Test category group creation
    console.log('\n3. Testing POST /api/category-groups');
    const createGroupResponse = await fetch(`${BASE_URL}/api/category-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: USER_ID,
        name: 'Test Expenses',
        type: 'EXPENSE',
        color: '#EF4444',
        is_default: false
      })
    });
    const createGroupData = await createGroupResponse.json();
    console.log('Status:', createGroupResponse.status);
    console.log('Response:', JSON.stringify(createGroupData, null, 2));
    
    // Test category creation
    console.log('\n4. Testing POST /api/categories');
    const createCategoryResponse = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: USER_ID,
        name: 'Test Food',
        color: '#FF6B6B',
        group_type: 'EXPENSE',
        is_custom: true
      })
    });
    const createCategoryData = await createCategoryResponse.json();
    console.log('Status:', createCategoryResponse.status);
    console.log('Response:', JSON.stringify(createCategoryData, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();