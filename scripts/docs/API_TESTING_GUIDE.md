# MoneyFlow API Testing Guide

This guide provides comprehensive instructions for testing all MoneyFlow API endpoints including budgets, budget categories, budget items, categories, category groups, and transactions using terminal commands.

## Prerequisites

1. **Development Server Running**: Ensure your Next.js development server is running:
   ```bash
   npm run dev
   ```
   The server should be accessible at `http://localhost:3000`

2. **Required Tools**:
   - `curl` (pre-installed on macOS/Linux)
   - `jq` (optional, for JSON formatting): `brew install jq`

3. **Test User**: Use `test-user` as the userId for all API testing to avoid conflicts with real data.

## Testing Scripts

### 1. Comprehensive Test Suite (`test-api-endpoints.sh`)

Runs a complete test suite covering all API endpoints with CRUD operations, error handling, and cleanup.

```bash
# Run the full test suite
./scripts/test-api-endpoints.sh
```

**Features:**
- Tests all API endpoints (budgets, budget-categories, budget-items, categories, category-groups, transactions)
- Creates, reads, updates, and deletes test data
- Tests error handling scenarios
- Automatic cleanup of test data
- Colored output with success/failure indicators
- Detailed response logging

### 2. Quick API Tester (`quick-api-test.sh`)

For testing individual endpoints quickly during development.

```bash
# Basic usage
./scripts/quick-api-test.sh [endpoint] [method] [data]

# Examples
./scripts/quick-api-test.sh budgets GET
./scripts/quick-api-test.sh categories GET
./scripts/quick-api-test.sh transactions POST '{"amount":500000,"type":"EXPENSE"}'
```

## Manual Testing with curl

### Server Health Check

```bash
# Check if the development server is running
curl -s http://localhost:3000 | head -5

# Check API base endpoint
curl -s http://localhost:3000/api
```

### Categories API

#### Get All Categories
```bash
curl -s "http://localhost:3000/api/categories?userId=test-user" | jq .
```

#### Create a Category
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "color": "#FF5722",
    "group_type": "EXPENSE",
    "user_id": "test-user",
    "is_custom": true
  }' \
  "http://localhost:3000/api/categories" | jq .
```

#### Update a Category
```bash
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Groceries",
    "color": "#4CAF50"
  }' \
  "http://localhost:3000/api/categories?categoryId=CATEGORY_ID" | jq .
```

#### Delete a Category
```bash
curl -s -X DELETE \
  "http://localhost:3000/api/categories?categoryId=CATEGORY_ID" | jq .
```

### Category Groups API

#### Get All Category Groups
```bash
curl -s "http://localhost:3000/api/category-groups?userId=test-user" | jq .
```

#### Create a Category Group
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Income",
    "type": "INCOME",
    "user_id": "test-user"
  }' \
  "http://localhost:3000/api/category-groups" | jq .
```

### Budgets API

#### Get All Budgets
```bash
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .
```

#### Create a Budget
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "name": "Monthly Budget",
    "amount": 5000000,
    "type": "monthly"
  }' \
  "http://localhost:3000/api/budgets" | jq .
```

#### Update a Budget
```bash
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BUDGET_ID",
    "name": "Updated Monthly Budget",
    "amount": 6000000
  }' \
  "http://localhost:3000/api/budgets" | jq .
```

#### Delete a Budget (Soft Delete)
```bash
curl -s -X DELETE \
  "http://localhost:3000/api/budgets?budget_id=BUDGET_ID" | jq .
```

### Budget Categories API

#### Get Budget Items (with Category Information)
```bash
curl -s "http://localhost:3000/api/budget-items?budgetId=BUDGET_ID" | jq .
```

#### Create a Budget Category
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "BUDGET_ID",
    "category_id": "CATEGORY_ID",
    "allocated_amount": 50000
  }' \
  "http://localhost:3000/api/budget-categories" | jq .
```

#### Get Budget Categories for a Budget
```bash
curl -s "http://localhost:3000/api/budget-categories?budgetId=BUDGET_ID" | jq .
```

### Transactions API

#### Get All Transactions
```bash
curl -s "http://localhost:3000/api/transactions?userId=test-user" | jq .
```

#### Get Transactions with Date Filter
```bash
curl -s "http://localhost:3000/api/transactions?userId=test-user&startDate=2024-01-01&endDate=2024-01-31" | jq .
```

#### Get Transactions by Category
```bash
curl -s "http://localhost:3000/api/transactions?userId=test-user&categoryId=CATEGORY_ID" | jq .
```

#### Create a Transaction
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500000,
    "type": "EXPENSE",
    "category_id": "CATEGORY_ID",
    "description": "Monthly Rent",
    "date": "2024-01-01",
    "user_id": "test-user",
    "merchant": "Property Management",
    "notes": "Monthly apartment rent",
    "tags": ["housing", "monthly"]
  }' \
  "http://localhost:3000/api/transactions" | jq .
```

#### Update a Transaction
```bash
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2600000,
    "description": "Updated Monthly Rent",
    "notes": "Rent increased"
  }' \
  "http://localhost:3000/api/transactions?transactionId=TRANSACTION_ID" | jq .
```

#### Delete a Transaction
```bash
curl -s -X DELETE \
  "http://localhost:3000/api/transactions?transactionId=TRANSACTION_ID" | jq .
```

## Testing Scenarios

### 1. Basic CRUD Operations

Test the complete lifecycle of each resource:

```bash
# 1. Create a budget
BUDGET_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"userId":"test-user","name":"Test Budget","amount":5000000,"type":"monthly"}' \
  "http://localhost:3000/api/budgets")

BUDGET_ID=$(echo $BUDGET_RESPONSE | jq -r '.id')
echo "Created budget: $BUDGET_ID"

# 2. Create a category group
GROUP_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Group","type":"EXPENSE","user_id":"test-user"}' \
  "http://localhost:3000/api/category-groups")

GROUP_ID=$(echo $GROUP_RESPONSE | jq -r '.id')
echo "Created group: $GROUP_ID"

# 3. Create a category in that group
CATEGORY_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Category","color":"#FF0000","group_type":"EXPENSE","category_group_id":"'$GROUP_ID'","user_id":"test-user"}' \
  "http://localhost:3000/api/categories")

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "Created category: $CATEGORY_ID"

# 4. Create a budget category allocation
BUDGET_CATEGORY_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"budget_id":"'$BUDGET_ID'","category_id":"'$CATEGORY_ID'","allocated_amount":100000}' \
  "http://localhost:3000/api/budget-categories")

echo "Created budget category allocation"

# 5. Create a transaction with that category
TRANSACTION_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"amount":-50000,"type":"EXPENSE","category_id":"'$CATEGORY_ID'","description":"Test Transaction","user_id":"test-user","date":"2024-01-15"}' \
  "http://localhost:3000/api/transactions")

TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | jq -r '.id')
echo "Created transaction: $TRANSACTION_ID"

# 6. Verify the data
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .
curl -s "http://localhost:3000/api/budget-items?budgetId=$BUDGET_ID" | jq .
curl -s "http://localhost:3000/api/transactions?userId=test-user&categoryId=$CATEGORY_ID" | jq .
```

### 2. Error Handling Tests

```bash
# Test invalid budget data
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"invalid":"data"}' \
  "http://localhost:3000/api/budgets"

# Test budget update without ID
curl -s -X PUT -H "Content-Type: application/json" \
  -d '{"name":"Updated Budget"}' \
  "http://localhost:3000/api/budgets"

# Test delete non-existent budget
curl -s -X DELETE \
  "http://localhost:3000/api/budgets?budget_id=non-existent-id"

# Test invalid category data
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"invalid":"data"}' \
  "http://localhost:3000/api/categories"

# Test non-existent resource
curl -s "http://localhost:3000/api/categories?categoryId=non-existent-id"

# Test invalid amount
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"amount":"invalid","type":"INCOME"}' \
  "http://localhost:3000/api/transactions"

# Test invalid budget category data
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"invalid":"data"}' \
  "http://localhost:3000/api/budget-categories"

# Test budget category with non-existent budget ID
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"budget_id":"non-existent-id","category_id":"CATEGORY_ID","allocated_amount":50000}' \
  "http://localhost:3000/api/budget-categories"

# Test budget category with non-existent category ID
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"budget_id":"BUDGET_ID","category_id":"non-existent-id","allocated_amount":50000}' \
  "http://localhost:3000/api/budget-categories"
```

### 3. Data Filtering Tests

```bash
# Test budget filtering by user
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .

# Test user isolation for budgets
curl -s "http://localhost:3000/api/budgets?userId=different-user" | jq .

# Test date range filtering for transactions
curl -s "http://localhost:3000/api/transactions?userId=test-user&startDate=2024-01-01&endDate=2024-01-31" | jq .

# Test category filtering
curl -s "http://localhost:3000/api/transactions?userId=test-user&categoryId=CATEGORY_ID" | jq .

# Test user isolation for transactions
curl -s "http://localhost:3000/api/transactions?userId=different-user" | jq .

# Test budget items filtering by budget ID
curl -s "http://localhost:3000/api/budget-items?budgetId=BUDGET_ID" | jq .

# Test budget categories filtering by budget ID
curl -s "http://localhost:3000/api/budget-categories?budgetId=BUDGET_ID" | jq .

# Test budget items with non-existent budget ID
curl -s "http://localhost:3000/api/budget-items?budgetId=non-existent-id" | jq .
```

### 4. Performance Testing

```bash
# Test budget API response time
time curl -s "http://localhost:3000/api/budgets?userId=test-user" > /dev/null

# Test transaction response time
time curl -s "http://localhost:3000/api/transactions?userId=test-user" > /dev/null

# Test with large date range
time curl -s "http://localhost:3000/api/transactions?userId=test-user&startDate=2020-01-01&endDate=2024-12-31" > /dev/null

# Test budget items API response time
time curl -s "http://localhost:3000/api/budget-items?budgetId=BUDGET_ID" > /dev/null

# Test budget categories API response time
time curl -s "http://localhost:3000/api/budget-categories?budgetId=BUDGET_ID" > /dev/null
```

## Common Issues and Troubleshooting

### 1. Server Not Running
```
Error: curl: (7) Failed to connect to localhost port 3000
```
**Solution**: Start the development server with `npm run dev`

### 2. Invalid JSON Response
```
Error: parse error: Invalid numeric literal
```
**Solution**: Check if the API endpoint exists and returns valid JSON

### 3. 404 Not Found
```
Status Code: 404
```
**Solution**: Verify the endpoint URL and ensure the resource exists

### 4. 400 Bad Request
```
Status Code: 400
```
**Solution**: Check the request data format and required fields

### 5. Database Connection Issues
```
Error: Database connection failed
```
**Solution**: Check Supabase configuration and environment variables

### 5. Budget Workflow Testing

```bash
# Complete budget lifecycle test
echo "=== Budget Lifecycle Test ==="

# 1. Create a budget
echo "Creating budget..."
BUDGET_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"userId":"test-user","name":"Test Monthly Budget","amount":10000000,"type":"monthly"}' \
  "http://localhost:3000/api/budgets")

BUDGET_ID=$(echo $BUDGET_RESPONSE | jq -r '.id')
echo "Created budget ID: $BUDGET_ID"

# 2. Verify budget creation
echo "Verifying budget..."
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .

# 3. Update budget
echo "Updating budget..."
curl -s -X PUT -H "Content-Type: application/json" \
  -d '{"id":"'$BUDGET_ID'","name":"Updated Monthly Budget","amount":12000000}' \
  "http://localhost:3000/api/budgets" | jq .

# 4. Verify update
echo "Verifying update..."
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .

# 5. Soft delete budget
echo "Deleting budget..."
curl -s -X DELETE "http://localhost:3000/api/budgets?budget_id=$BUDGET_ID" | jq .

# 6. Verify deletion (should not appear in active budgets)
echo "Verifying deletion..."
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq .
```

## Advanced Testing

### Using Postman/Insomnia

1. Import the API endpoints into Postman or Insomnia
2. Set up environment variables for base URL and test user ID
3. Create test collections for each API group (budgets, budget-categories, budget-items, categories, transactions)
4. Set up automated test scripts
5. Create budget-specific test scenarios:
   - Budget creation with different periods (monthly, yearly)
   - Budget amount validation
   - Currency handling
   - User isolation testing

### Browser Network Tab

1. Open browser developer tools (F12)
2. Navigate to the Network tab
3. Use the MoneyFlow app normally
4. Inspect API calls, request/response data, and timing
5. Pay attention to budget-related API calls in the spending section

### Integration Testing

```bash
# Run the app's test suite
npm run test

# Run specific test files
npm run test -- --testNamePattern="API"

# Test budget integration with categories
npm run test -- --testNamePattern="Budget"
```

## Best Practices

1. **Use Test Data**: Always use test user IDs and test data
2. **Clean Up**: Delete test data after testing (remember budgets use soft delete)
3. **Check Status Codes**: Verify HTTP status codes match expectations
4. **Validate Responses**: Check response structure and data types
5. **Test Edge Cases**: Try invalid data, empty requests, and boundary conditions
6. **Monitor Performance**: Check response times and database queries
7. **Test Concurrency**: Simulate multiple users/sessions
8. **Budget Testing**: Test different budget periods, amounts, and currency handling
9. **Budget Categories**: Test budget category allocations, verify category information in budget items
10. **User Isolation**: Ensure budgets and budget categories are properly isolated between users
11. **Foreign Key Constraints**: Test budget categories with valid budget and category IDs
12. **Soft Delete Verification**: Confirm deleted budgets don't appear in active lists

## Useful Commands

```bash
# Pretty print JSON responses
curl -s "URL" | jq .

# Save response to file
curl -s "URL" > response.json

# Show only HTTP status code
curl -s -o /dev/null -w "%{http_code}" "URL"

# Show response time
curl -s -o /dev/null -w "%{time_total}" "URL"

# Follow redirects
curl -s -L "URL"

# Include headers in output
curl -s -i "URL"

# Extract specific fields from budget responses
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq '.[] | {id, name, amount}'

# Count active budgets for a user
curl -s "http://localhost:3000/api/budgets?userId=test-user" | jq 'length'

# Test budget creation and extract ID in one line
BUDGET_ID=$(curl -s -X POST -H "Content-Type: application/json" -d '{"userId":"test-user","name":"Quick Test","amount":1000000,"type":"monthly"}' "http://localhost:3000/api/budgets" | jq -r '.id')

# Extract budget items with category information
curl -s "http://localhost:3000/api/budget-items?budgetId=BUDGET_ID" | jq '.[] | {id, allocated_amount, category_name, category_color}'

# Count budget categories for a budget
curl -s "http://localhost:3000/api/budget-categories?budgetId=BUDGET_ID" | jq 'length'

# Create budget category and extract response in one line
BUDGET_CATEGORY_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"budget_id":"BUDGET_ID","category_id":"CATEGORY_ID","allocated_amount":50000}' "http://localhost:3000/api/budget-categories")

# Get total allocated amount for a budget
curl -s "http://localhost:3000/api/budget-items?budgetId=BUDGET_ID" | jq '[.[] | .allocated_amount] | add'
```

This guide should help you thoroughly test all MoneyFlow API endpoints and ensure they're working correctly in your development environment.