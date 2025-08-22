const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

async function initializeUserCategories() {
  console.log('🚀 Initializing categories for user:', USER_ID);
  
  try {
    // Create default categories using the simplified approach
    console.log('\n1. Creating default categories...');
    
    const defaultCategories = [
      { name: 'Food & Dining', color: '#FF6B6B', group_type: 'EXPENSE' },
      { name: 'Transportation', color: '#4ECDC4', group_type: 'EXPENSE' },
      { name: 'Shopping', color: '#45B7D1', group_type: 'EXPENSE' },
      { name: 'Entertainment', color: '#96CEB4', group_type: 'EXPENSE' },
      { name: 'Bills & Utilities', color: '#FFEAA7', group_type: 'EXPENSE' },
      { name: 'Healthcare', color: '#DDA0DD', group_type: 'EXPENSE' },
      { name: 'Income', color: '#82E0AA', group_type: 'INCOME' },
      { name: 'Transfer', color: '#9CA3AF', group_type: 'TRANSFER' }
    ];
    
    for (const category of defaultCategories) {
      const response = await fetch(`${BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          name: category.name,
          color: category.color,
          group_type: category.group_type,
          is_custom: false
        })
      });
      const categoryData = await response.json();
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, categoryData);
      console.log(`Created category: ${category.name} (${categoryData.id || 'FAILED'})`);
      
      if (!response.ok) {
        console.error(`❌ Failed to create ${category.name}:`, categoryData);
      }
    }
    
    console.log('\n✅ Successfully initialized all categories!');
    
  } catch (error) {
    console.error('❌ Failed to initialize categories:', error.message);
  }
}

initializeUserCategories();