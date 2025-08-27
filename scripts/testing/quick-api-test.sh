#!/bin/bash

# Quick API Testing Script for MoneyFlow
# Usage: ./scripts/quick-api-test.sh [endpoint] [method] [data]
# Examples:
#   ./scripts/quick-api-test.sh categories GET
#   ./scripts/quick-api-test.sh transactions POST '{"amount":1000000,"type":"INCOME"}'

BASE_URL="http://localhost:3000/api"
TEST_USER_ID="test-user"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Helper function
print_usage() {
    echo -e "${BLUE}MoneyFlow Quick API Tester${NC}"
    echo -e "${BLUE}===========================${NC}"
    echo "Usage: $0 [endpoint] [method] [data]"
    echo ""
    echo -e "${YELLOW}Available Endpoints:${NC}"
    echo "  categories       - Category management"
    echo "  category-groups  - Category group management"
    echo "  transactions     - Transaction management"
    echo ""
    echo -e "${YELLOW}Available Methods:${NC}"
    echo "  GET    - Retrieve data"
    echo "  POST   - Create new resource"
    echo "  PUT    - Update existing resource"
    echo "  DELETE - Delete resource"
    echo ""
    echo -e "${YELLOW}Quick Test Examples:${NC}"
    echo "  # Test server health"
    echo "  curl -s http://localhost:3000 | head -5"
    echo ""
    echo "  # Get all categories"
    echo "  $0 categories GET"
    echo ""
    echo "  # Get all transactions"
    echo "  $0 transactions GET"
    echo ""
    echo "  # Create a category"
    echo '  $0 categories POST '"'"'{"name":"Test Category","color":"#FF0000","group_type":"EXPENSE","user_id":"test-user"}'""
    echo ""
    echo "  # Create a transaction"
    echo '  $0 transactions POST '"'"'{"amount":500000,"type":"EXPENSE","description":"Test Purchase","user_id":"test-user","date":"2024-01-15"}'""
    echo ""
    echo -e "${YELLOW}Common Query Parameters:${NC}"
    echo "  ?userId=test-user           - Filter by user"
    echo "  ?categoryId=category-id     - Filter by category"
    echo "  ?transactionId=trans-id     - Get specific transaction"
    echo "  ?startDate=2024-01-01       - Date range start"
    echo "  ?endDate=2024-01-31         - Date range end"
}

# Check if server is running
check_server() {
    if ! curl -s "http://localhost:3000" > /dev/null; then
        echo -e "${RED}❌ Development server is not running!${NC}"
        echo -e "${YELLOW}Please start it with: npm run dev${NC}"
        exit 1
    fi
}

# Main function
if [ $# -eq 0 ]; then
    print_usage
    exit 0
fi

check_server

ENDPOINT=$1
METHOD=${2:-GET}
DATA=$3

# Build URL
URL="$BASE_URL/$ENDPOINT"

# Add default user ID for GET requests if not already present
if [ "$METHOD" = "GET" ] && [[ "$URL" != *"userId="* ]] && [[ "$URL" != *"categoryId="* ]] && [[ "$URL" != *"transactionId="* ]] && [[ "$URL" != *"groupId="* ]]; then
    if [[ "$URL" == *"?"* ]]; then
        URL="$URL&userId=$TEST_USER_ID"
    else
        URL="$URL?userId=$TEST_USER_ID"
    fi
fi

echo -e "${BLUE}Testing API Endpoint${NC}"
echo -e "${BLUE}===================${NC}"
echo "Method: $METHOD"
echo "URL: $URL"
if [ -n "$DATA" ]; then
    echo "Data: $DATA"
fi
echo ""

# Make the request
if [ "$METHOD" = "GET" ]; then
    echo -e "${YELLOW}Response:${NC}"
    curl -s -w "\n\nStatus Code: %{http_code}\nResponse Time: %{time_total}s\n" "$URL" | jq . 2>/dev/null || curl -s -w "\n\nStatus Code: %{http_code}\nResponse Time: %{time_total}s\n" "$URL"
elif [ -n "$DATA" ]; then
    echo -e "${YELLOW}Response:${NC}"
    curl -s -w "\n\nStatus Code: %{http_code}\nResponse Time: %{time_total}s\n" -X "$METHOD" -H "Content-Type: application/json" -d "$DATA" "$URL" | jq . 2>/dev/null || curl -s -w "\n\nStatus Code: %{http_code}\nResponse Time: %{time_total}s\n" -X "$METHOD" -H "Content-Type: application/json" -d "$DATA" "$URL"
else
    echo -e "${RED}Error: $METHOD requests require data${NC}"
    echo "Example: $0 $ENDPOINT $METHOD '{\"key\":\"value\"}'"
    exit 1
fi

echo -e "\n${GREEN}✅ Test completed${NC}"