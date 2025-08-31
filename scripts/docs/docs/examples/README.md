# Financial Metrics Calculator Examples

This directory contains comprehensive examples for calculating and displaying financial metrics in the MoneyFlow application. The examples demonstrate how to process transaction data to generate key financial insights.

## Files Overview

### 1. `financial-metrics-calculator.ts`
Core calculation functions for financial metrics with comprehensive error handling and edge case management.

### 2. `FinancialMetricsDisplay.tsx`
React component that demonstrates how to use the calculation functions in a user interface with proper loading states and responsive design.

### 3. `test-financial-metrics.ts`
A comprehensive test suite that demonstrates all calculator functions with realistic sample data:

- **Purpose**: Provides working examples and validates calculator functionality
- **Sample Data**: Indonesian Rupiah transactions including salary, freelance, rent, groceries, utilities
- **Test Coverage**: Individual calculations, comprehensive metrics, monthly filtering, edge cases, performance
- **Output**: Formatted console output showing all calculations with currency formatting
- **Usage**: Run directly to see the calculator in action with sample data

## Financial Metrics Covered

### 1. **Total Income**
- Sums all income transactions (positive amounts or INCOME type)
- Handles edge cases like missing amounts
- Returns 0 for empty datasets

```typescript
const totalIncome = calculateTotalIncome(transactions)
```

### 2. **Total Spending**
- Sums all expense transactions (negative amounts or EXPENSE type)
- Converts negative amounts to positive for total calculation
- Handles edge cases gracefully

```typescript
const totalSpending = calculateTotalSpending(transactions)
```

### 3. **Income by Categories**
- Groups income transactions by category
- Calculates amounts, percentages, and transaction counts
- Sorts by amount (highest first)
- Handles uncategorized transactions

```typescript
const incomeBreakdown = calculateIncomeByCategories(transactions, categories)
```

### 4. **Spending by Categories**
- Groups expense transactions by category
- Provides detailed breakdown with percentages
- Includes transaction count per category
- Handles missing category information

```typescript
const spendingBreakdown = calculateSpendingByCategories(transactions, categories)
```

### 5. **Net Cashflow**
- Calculates difference between total income and total spending
- Positive value indicates surplus, negative indicates deficit
- Essential for financial health assessment

```typescript
const netCashflow = calculateNetCashflow(transactions)
```

## Usage Examples

### Running the Test Suite

The easiest way to see the financial metrics calculator in action is to run the comprehensive test suite:

```bash
# Navigate to the examples directory
cd examples

# Run the test file (if using ts-node)
npx ts-node test-financial-metrics.ts

# Or compile and run with Node.js
npx tsc test-financial-metrics.ts && node test-financial-metrics.js
```

The test suite includes:
- Individual calculation tests with sample Indonesian Rupiah transactions
- Comprehensive metrics calculation
- Monthly filtering demonstrations
- Edge case handling (empty datasets, zero amounts, uncategorized transactions)
- Performance testing with 1000+ transactions

### Basic Usage

```typescript
import {
  calculateTotalIncome,
  calculateTotalSpending,
  calculateNetCashflow,
  calculateAllMetrics
} from './financial-metrics-calculator'

// Calculate individual metrics
const income = calculateTotalIncome(transactions)
const spending = calculateTotalSpending(transactions)
const cashflow = calculateNetCashflow(transactions)

// Calculate all metrics at once
const allMetrics = calculateAllMetrics(transactions, categories)
```

### Monthly Filtering

```typescript
import { filterTransactionsByMonth } from './financial-metrics-calculator'

// Filter transactions for current month
const currentMonthTransactions = filterTransactionsByMonth(transactions)

// Filter for specific month
const januaryTransactions = filterTransactionsByMonth(
  transactions, 
  new Date('2024-01-15')
)
```

### Date Range Filtering

```typescript
import { calculateAllMetrics } from './financial-metrics-calculator'

// Calculate metrics for specific date range
const metrics = calculateAllMetrics(
  transactions,
  categories,
  new Date('2024-01-01'), // Start date
  new Date('2024-01-31')  // End date
)
```

### React Component Usage

```tsx
import { FinancialMetricsDisplay } from './FinancialMetricsDisplay'

function MyFinancialDashboard() {
  const { transactions, categories } = useFinancialData()
  
  return (
    <FinancialMetricsDisplay 
      transactions={transactions}
      categories={categories}
      selectedMonth={new Date()}
    />
  )
}
```

## Data Structure Requirements

### Transaction Object
```typescript
interface Transaction {
  id: string
  user_id: string
  date: string // ISO date string
  description: string
  amount: number // Positive for income, negative for expenses
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  category_id: string
  merchant: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}
```

### Category Object
```typescript
interface CategoryDB {
  id: string
  user_id: string
  name: string
  color: string
  group_type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  category_group_id: string
  is_custom: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

## Edge Cases Handled

### 1. **Empty Datasets**
- Functions return appropriate default values (0 or empty arrays)
- UI components show "No data" messages
- Prevents division by zero errors

### 2. **Missing Transaction Amounts**
- Treats undefined/null amounts as 0
- Continues processing other valid transactions
- Logs warnings for data quality monitoring

### 3. **Uncategorized Transactions**
- Groups under "Uncategorized" category
- Maintains data integrity in calculations
- Provides visibility into data quality issues

### 4. **Invalid Date Formats**
- Gracefully handles malformed date strings
- Filters out transactions with invalid dates
- Maintains calculation accuracy

### 5. **Missing Categories**
- Uses fallback category names
- Continues calculations with available data
- Prevents application crashes

## Performance Considerations

### 1. **Large Datasets**
- Functions are optimized for performance with large transaction sets
- Use filtering to reduce dataset size before calculations
- Consider pagination for UI components

### 2. **Memory Usage**
- Calculations are performed in-memory
- Consider chunking for very large datasets
- Use React.memo for component optimization

### 3. **Calculation Frequency**
- Cache results when possible
- Use React hooks for memoization
- Debounce frequent recalculations

## Error Handling

### 1. **Input Validation**
```typescript
if (!transactions || transactions.length === 0) {
  return 0 // or appropriate default
}
```

### 2. **Safe Calculations**
```typescript
const amount = transaction.amount || 0
const percentage = totalIncome > 0 ? (amount / totalIncome) * 100 : 0
```

### 3. **Graceful Degradation**
- Functions continue working with partial data
- UI components show loading and error states
- User experience remains smooth

## Testing Examples

### Unit Tests
```typescript
describe('Financial Metrics Calculator', () => {
  test('calculates total income correctly', () => {
    const transactions = [
      { amount: 1000, type: 'INCOME' },
      { amount: 500, type: 'INCOME' },
      { amount: -200, type: 'EXPENSE' }
    ]
    
    expect(calculateTotalIncome(transactions)).toBe(1500)
  })
  
  test('handles empty dataset', () => {
    expect(calculateTotalIncome([])).toBe(0)
  })
})
```

### Integration Tests
```typescript
test('calculates all metrics correctly', () => {
  const metrics = calculateAllMetrics(sampleTransactions, sampleCategories)
  
  expect(metrics.totalIncome).toBeGreaterThan(0)
  expect(metrics.totalSpending).toBeGreaterThan(0)
  expect(metrics.netCashflow).toBe(metrics.totalIncome - metrics.totalSpending)
  expect(metrics.incomeByCategories).toHaveLength(2)
  expect(metrics.spendingByCategories).toHaveLength(2)
})
```

## Best Practices

### 1. **Data Validation**
- Always validate input data before calculations
- Handle null/undefined values gracefully
- Log data quality issues for monitoring

### 2. **Performance Optimization**
- Filter data before processing when possible
- Use memoization for expensive calculations
- Consider server-side calculations for large datasets

### 3. **User Experience**
- Show loading states during calculations
- Provide meaningful error messages
- Use progressive disclosure for detailed breakdowns

### 4. **Accessibility**
- Use semantic HTML in components
- Provide proper ARIA labels
- Ensure keyboard navigation works

### 5. **Internationalization**
- Use proper currency formatting
- Support different date formats
- Consider right-to-left languages

## Integration with MoneyFlow App

### 1. **API Integration**
```typescript
// Use with existing transaction hooks
const { transactions } = useTransactions()
const { categories } = useCategories()

const metrics = calculateAllMetrics(transactions, categories)
```

### 2. **Context Integration**
```typescript
// Use with TransactionContext
const { transactions } = useContext(TransactionContext)
const { categories } = useContext(CategoryContext)
```

### 3. **Page Integration**
```typescript
// Add to existing pages
import { FinancialMetricsDisplay } from '@/examples/FinancialMetricsDisplay'

export default function DashboardPage() {
  return (
    <PageLayout>
      <FinancialMetricsDisplay 
        transactions={transactions}
        categories={categories}
      />
    </PageLayout>
  )
}
```

## Customization Options

### 1. **Currency Formatting**
- Modify currency locale and format
- Support multiple currencies
- Custom decimal places

### 2. **Date Ranges**
- Custom date range selection
- Fiscal year calculations
- Quarter-based reporting

### 3. **Category Grouping**
- Custom category hierarchies
- Tag-based grouping
- Merchant-based analysis

### 4. **Visual Customization**
- Custom color schemes
- Different chart types
- Responsive breakpoints

## Troubleshooting

### Common Issues

1. **"No data" showing when data exists**
   - Check date filtering logic
   - Verify transaction type filtering
   - Ensure categories are properly loaded

2. **Incorrect calculations**
   - Verify transaction amount signs
   - Check category mappings
   - Validate date formats

3. **Performance issues**
   - Reduce dataset size with filtering
   - Implement pagination
   - Use React.memo for components

4. **TypeScript errors**
   - Ensure proper type imports
   - Check interface compatibility
   - Verify null/undefined handling

## Contributing

When extending these examples:

1. Maintain backward compatibility
2. Add comprehensive tests
3. Update documentation
4. Follow existing code patterns
5. Handle edge cases properly

## License

These examples are part of the MoneyFlow application and follow the same license terms.