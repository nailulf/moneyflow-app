#!/bin/bash

# MoneyFlow API Testing Script
# This script tests all API endpoints to ensure they're working correctly
# Run this script while your development server is running (npm run dev)

set -e  # Exit on any error

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api"
TEST_USER_ID="test-user-$(date +%s)"  # Unique test user ID
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "$CONTENT_TYPE" -d "$data" "$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $status_code"
    echo "Response Body: $body"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "$description - PASSED"
        return 0
    else
        print_error "$description - FAILED (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

# Start testing
echo -e "${BLUE}🚀 MoneyFlow API Testing Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo "Base URL: $BASE_URL"
echo "Test User ID: $TEST_USER_ID"
echo "Timestamp: $(date)"

# Check if server is running
print_header "Server Health Check"
if curl -s "$BASE_URL" > /dev/null; then
    print_success "Development server is running"
else
    print_error "Development server is not running. Please start it with 'npm run dev'"
    exit 1
fi

# Test Variables (will be populated during tests)
CATEGORY_GROUP_ID=""
CATEGORY_ID=""
TRANSACTION_ID=""

# =============================================================================
# CATEGORY GROUPS API TESTS
# =============================================================================

print_header "Category Groups API Tests"

# Test 1: Create Category Group
print_info "Creating test category group..."
category_group_data='{
    "name": "Test Income Group",
    "type": "INCOME",
    "user_id": "'$TEST_USER_ID'"
}'

if test_endpoint "POST" "$API_BASE/category-groups" "$category_group_data" "201" "Create Category Group"; then
    # Extract category group ID from response
    CATEGORY_GROUP_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_info "Created category group with ID: $CATEGORY_GROUP_ID"
fi

# Test 2: Get All Category Groups
test_endpoint "GET" "$API_BASE/category-groups?userId=$TEST_USER_ID" "" "200" "Get All Category Groups"

# Test 3: Get Single Category Group
if [ -n "$CATEGORY_GROUP_ID" ]; then
    test_endpoint "GET" "$API_BASE/category-groups?groupId=$CATEGORY_GROUP_ID" "" "200" "Get Single Category Group"
fi

# Test 4: Update Category Group
if [ -n "$CATEGORY_GROUP_ID" ]; then
    update_group_data='{
        "name": "Updated Test Income Group",
        "type": "INCOME"
    }'
    test_endpoint "PUT" "$API_BASE/category-groups?groupId=$CATEGORY_GROUP_ID" "$update_group_data" "200" "Update Category Group"
fi

# =============================================================================
# CATEGORIES API TESTS
# =============================================================================

print_header "Categories API Tests"

# Test 5: Create Category
print_info "Creating test category..."
category_data='{
    "name": "Test Salary",
    "color": "#4CAF50",
    "group_type": "INCOME",
    "category_group_id": "'$CATEGORY_GROUP_ID'",
    "user_id": "'$TEST_USER_ID'",
    "is_custom": true
}'

if test_endpoint "POST" "$API_BASE/categories" "$category_data" "201" "Create Category"; then
    # Extract category ID from response
    CATEGORY_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_info "Created category with ID: $CATEGORY_ID"
fi

# Test 6: Get All Categories
test_endpoint "GET" "$API_BASE/categories?userId=$TEST_USER_ID" "" "200" "Get All Categories"

# Test 7: Get Single Category
if [ -n "$CATEGORY_ID" ]; then
    test_endpoint "GET" "$API_BASE/categories?categoryId=$CATEGORY_ID" "" "200" "Get Single Category"
fi

# Test 8: Update Category
if [ -n "$CATEGORY_ID" ]; then
    update_category_data='{
        "name": "Updated Test Salary",
        "color": "#2196F3"
    }'
    test_endpoint "PUT" "$API_BASE/categories?categoryId=$CATEGORY_ID" "$update_category_data" "200" "Update Category"
fi

# =============================================================================
# TRANSACTIONS API TESTS
# =============================================================================

print_header "Transactions API Tests"

# Test 9: Create Transaction
print_info "Creating test transaction..."
transaction_data='{
    "amount": 5000000,
    "type": "INCOME",
    "category_id": "'$CATEGORY_ID'",
    "description": "Test Salary Payment",
    "date": "'$(date +%Y-%m-%d)'",
    "user_id": "'$TEST_USER_ID'",
    "merchant": "Test Company",
    "notes": "API test transaction",
    "tags": ["salary", "test"]
}'

if test_endpoint "POST" "$API_BASE/transactions" "$transaction_data" "201" "Create Transaction"; then
    # Extract transaction ID from response
    TRANSACTION_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_info "Created transaction with ID: $TRANSACTION_ID"
fi

# Test 10: Get All Transactions
test_endpoint "GET" "$API_BASE/transactions?userId=$TEST_USER_ID" "" "200" "Get All Transactions"

# Test 11: Get Transactions with Date Filter
start_date=$(date -d "1 month ago" +%Y-%m-%d)
end_date=$(date +%Y-%m-%d)
test_endpoint "GET" "$API_BASE/transactions?userId=$TEST_USER_ID&startDate=$start_date&endDate=$end_date" "" "200" "Get Transactions with Date Filter"

# Test 12: Get Transactions by Category
if [ -n "$CATEGORY_ID" ]; then
    test_endpoint "GET" "$API_BASE/transactions?userId=$TEST_USER_ID&categoryId=$CATEGORY_ID" "" "200" "Get Transactions by Category"
fi

# Test 13: Update Transaction
if [ -n "$TRANSACTION_ID" ]; then
    update_transaction_data='{
        "amount": 5500000,
        "description": "Updated Test Salary Payment",
        "notes": "Updated API test transaction"
    }'
    test_endpoint "PUT" "$API_BASE/transactions?transactionId=$TRANSACTION_ID" "$update_transaction_data" "200" "Update Transaction"
fi

# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

print_header "Error Handling Tests"

# Test 14: Invalid Category Creation (Missing Required Fields)
invalid_category_data='{
    "name": "Invalid Category"
}'
test_endpoint "POST" "$API_BASE/categories" "$invalid_category_data" "400" "Invalid Category Creation (Missing Fields)"

# Test 15: Invalid Transaction Creation (Invalid Amount)
invalid_transaction_data='{
    "amount": "invalid_amount",
    "type": "INCOME",
    "description": "Invalid Transaction",
    "user_id": "'$TEST_USER_ID'"
}'
test_endpoint "POST" "$API_BASE/transactions" "$invalid_transaction_data" "400" "Invalid Transaction Creation (Invalid Amount)"

# Test 16: Get Non-existent Resource
test_endpoint "GET" "$API_BASE/categories?categoryId=non-existent-id" "" "404" "Get Non-existent Category"

# Test 17: Update Non-existent Resource
update_nonexistent_data='{
    "name": "Updated Non-existent"
}'
test_endpoint "PUT" "$API_BASE/transactions?transactionId=non-existent-id" "$update_nonexistent_data" "404" "Update Non-existent Transaction"

# =============================================================================
# CLEANUP
# =============================================================================

print_header "Cleanup"

# Test 18: Delete Transaction
if [ -n "$TRANSACTION_ID" ]; then
    test_endpoint "DELETE" "$API_BASE/transactions?transactionId=$TRANSACTION_ID" "" "200" "Delete Transaction"
fi

# Test 19: Delete Category
if [ -n "$CATEGORY_ID" ]; then
    test_endpoint "DELETE" "$API_BASE/categories?categoryId=$CATEGORY_ID" "" "200" "Delete Category"
fi

# Test 20: Delete Category Group
if [ -n "$CATEGORY_GROUP_ID" ]; then
    test_endpoint "DELETE" "$API_BASE/category-groups?groupId=$CATEGORY_GROUP_ID" "" "200" "Delete Category Group"
fi

# =============================================================================
# SUMMARY
# =============================================================================

print_header "Test Summary"
echo -e "${GREEN}🎉 API Testing Complete!${NC}"
echo -e "${BLUE}All endpoints have been tested for:${NC}"
echo "   ✅ Category Groups (CRUD operations)"
echo "   ✅ Categories (CRUD operations)"
echo "   ✅ Transactions (CRUD operations)"
echo "   ✅ Error handling scenarios"
echo "   ✅ Data filtering and querying"
echo "   ✅ Resource cleanup"

echo -e "\n${YELLOW}💡 Tips for Manual Testing:${NC}"
echo "   • Use the browser Network tab to inspect API calls"
echo "   • Test with different user IDs to verify data isolation"
echo "   • Try edge cases like very large amounts or special characters"
echo "   • Test concurrent operations (multiple users/sessions)"
echo "   • Verify database constraints and validations"

echo -e "\n${BLUE}📚 For more detailed testing:${NC}"
echo "   • Check the examples/ directory for financial metrics testing"
echo "   • Use Postman or Insomnia for interactive API testing"
echo "   • Run integration tests with: npm run test"
echo "   • Monitor API performance with: npm run dev (check terminal logs)"

echo -e "\n${GREEN}✨ Happy Testing! ✨${NC}"