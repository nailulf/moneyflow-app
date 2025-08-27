const fs = require('fs');
const path = require('path');
const http = require('http');

// Read .env.local file manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const TEST_USER_ID = envVars.TEST_USER_ID || '1d16c616-77a6-48de-9a54-dde7845f720d';
const BASE_URL = 'http://localhost:3000';

// Utility function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test Budget API
async function testBudgetAPI() {
  console.log('\n=== Testing Budget API ===');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/budget?userId=${TEST_USER_ID}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const result = await makeRequest(options);
    console.log(`Status: ${result.status}`);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('✅ Budget API test successful');
    } else {
      console.log('❌ Budget API test failed');
    }
  } catch (error) {
    console.error('❌ Budget API test error:', error.message);
  }
}

// Test Category Groups API
async function testCategoryGroupsAPI() {
  console.log('\n=== Testing Category Groups API ===');
  
  try {
    // Test GET category groups
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/category-groups?userId=${TEST_USER_ID}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const getResult = await makeRequest(getOptions);
    console.log(`GET Status: ${getResult.status}`);
    console.log('GET Response:', JSON.stringify(getResult.data, null, 2));
    
    // Test POST category group
    const postData = JSON.stringify({
      user_id: TEST_USER_ID,
      name: 'Test Category Group',
      description: 'A test category group created by API test'
    });
    
    const postOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/category-groups',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const postResult = await makeRequest(postOptions, postData);
    console.log(`POST Status: ${postResult.status}`);
    console.log('POST Response:', JSON.stringify(postResult.data, null, 2));
    
    if (getResult.status === 200 && postResult.status === 201) {
      console.log('✅ Category Groups API tests successful');
    } else {
      console.log('❌ Category Groups API tests failed');
    }
  } catch (error) {
    console.error('❌ Category Groups API test error:', error.message);
  }
}

// Test Categories API
async function testCategoriesAPI() {
  console.log('\n=== Testing Categories API ===');
  
  try {
    // Test GET categories
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/categories?userId=${TEST_USER_ID}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const getResult = await makeRequest(getOptions);
    console.log(`GET Status: ${getResult.status}`);
    console.log('GET Response:', JSON.stringify(getResult.data, null, 2));
    
    if (getResult.status === 200) {
      console.log('✅ Categories API test successful');
    } else {
      console.log('❌ Categories API test failed');
    }
  } catch (error) {
    console.error('❌ Categories API test error:', error.message);
  }
}

// Test Transactions API
async function testTransactionsAPI() {
  console.log('\n=== Testing Transactions API ===');
  
  try {
    // Test GET transactions
    const getOptions = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/transactions?userId=${TEST_USER_ID}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const getResult = await makeRequest(getOptions);
    console.log(`GET Status: ${getResult.status}`);
    console.log('GET Response:', JSON.stringify(getResult.data, null, 2));
    
    if (getResult.status === 200) {
      console.log('✅ Transactions API test successful');
    } else {
      console.log('❌ Transactions API test failed');
    }
  } catch (error) {
    console.error('❌ Transactions API test error:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Consolidated API Tests');
  console.log(`Using Test User ID: ${TEST_USER_ID}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  await testBudgetAPI();
  await testCategoryGroupsAPI();
  await testCategoriesAPI();
  await testTransactionsAPI();
  
  console.log('\n✨ All API tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testBudgetAPI,
  testCategoryGroupsAPI,
  testCategoriesAPI,
  testTransactionsAPI,
  runAllTests
};