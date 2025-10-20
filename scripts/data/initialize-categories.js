// Using native fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3000';
const USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID || '1d16c616-77a6-48de-9a54-dde7845f720d';

async function initializeUserCategories() {
  console.log('🚀 Initializing categories for user:', USER_ID);
  
  try {
    // Create default categories using the simplified approach
    console.log('\n1. Creating default categories...');
    
    // First, create category groups
    console.log('Creating category groups...');
    const categoryGroups = [
      { name: 'Expenses', group_type: 'EXPENSE', color: '#FF6B6B' },
      { name: 'Income', group_type: 'INCOME', color: '#82E0AA' },
      { name: 'Transfer', group_type: 'TRANSFER', color: '#9CA3AF' }
    ];
    
    const createdGroups = {};
    
    for (const group of categoryGroups) {
      const response = await fetch(`${BASE_URL}/api/category-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          name: group.name,
          group_type: group.group_type,
          color: group.color
        })
      });
      
      if (response.ok) {
        const groupData = await response.json();
        createdGroups[group.group_type] = groupData.id;
        console.log(`✅ Created group: ${group.name} (${groupData.id})`);
      } else {
        const errorData = await response.json();
        console.log(`❌ Failed to create group ${group.name}:`, errorData);
      }
    }
    
    const defaultCategories = [
      { name: 'Food & Dining', color: '#FF6B6B', group_type: 'EXPENSE' },
      { name: 'Transportation', color: '#4ECDC4', group_type: 'EXPENSE' },
      { name: 'Shopping', color: '#45B7D1', group_type: 'EXPENSE' },
      { name: 'Entertainment', color: '#96CEB4', group_type: 'EXPENSE' },
      { name: 'Bills & Utilities', color: '#FFEAA7', group_type: 'EXPENSE' },
      { name: 'Healthcare', color: '#DDA0DD', group_type: 'EXPENSE' },
      { name: 'Salary', color: '#82E0AA', group_type: 'INCOME' },
      { name: 'Investment', color: '#A8E6CF', group_type: 'INCOME' },
      { name: 'Bank Transfer', color: '#9CA3AF', group_type: 'TRANSFER' }
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
          category_group_id: createdGroups[category.group_type],
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