# Budget & Breakdown Page - Development Prompt

## Overview
Create a comprehensive Budget & Breakdown page for the MoneyFlow expense tracking app using Next.js 14, TypeScript, Tailwind CSS, and Shadcn/ui components. The page should provide users with detailed insights into their spending patterns, budget management, and financial overview. This is an MVP implementation designed for scalability and future growth.

## Project Context
- **Product Type**: Zero-to-one feature development within existing MoneyFlow app
- **Target Market**: Primary focus on Indonesia with global currency support
- **User Scope**: Single-user implementation with multi-user architecture considerations
- **Platform**: Web-based application only
- **Performance Requirement**: All operations must complete within 2 seconds

## Technical Requirements

### Tech Stack
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui components
- **Backend**: Supabase (PostgreSQL with RLS)
- **Authentication**: Integrated with existing MoneyFlow authentication system
- **State Management**: React Query for server state, React hooks for component state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization

### Database Integration
- Connect to existing Supabase `transactions` table
- Create new `budgets` table with monthly/yearly budget allocations
  - `id` (UUID)
  - `category_id` (string) --> used user's category_id
  - `user_id` (UUID) -- Indexed for multi-user scalability
  - `apply_yearly` (boolean) --> if true, then it will shown as yearly budget
  - `apply_monthly` (boolean) --> if true, then it will shown as monthly budget
  - `yearly_budget` (numeric) --> if year is true, then it will be used
  - `monthly_budget` (numeric) --> if month is true, then it will be used
  - `currency` (varchar(3)) -- ISO 4217 currency codes
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - INDEX: (user_id, apply_yearly, apply_monthly) for performance
- Create `budget_categories` table for category management
- Implement Row Level Security (RLS) for user data isolation
- Schema designed for future multi-user expansion with Indonesian market focus

## Core Features & User Flow

### 1. Financial Overview Section [DONE]
**Display Components:**
- Total Income (current period) with multi-currency support
- Total Expenses (current period) with Indonesian Rupiah (IDR) primary focus
- Net Cash Flow (Income - Expenses)
- Budget vs Actual spending comparison
- Support for global currencies with localized formatting

**Implementation:**
```typescript
interface FinancialOverview {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  budgetAllocated: number
  budgetUsed: number
  budgetRemaining: number
}
```

### 2. Time Range Filter
**Filter Options:**
- Weekly view (last 4 weeks)
- Monthly view (current month, last 12 months)
- Yearly view (current year, last 5 years)

**User Flow:**
1. User selects time range from dropdown
2. All data components refresh automatically
3. Charts and breakdowns update to match selected period
4. URL params update for shareable/bookmarkable state

### 3. Transaction Breakdown by Categories
**Pre-created Budget Categories (expandable to 15+):**
1. Get categories from user's categories table
2. If no categories exist, use default categories
3. If user has custom categories, display those first

**Category Display Features:**
- Amount spent per category
- Percentage of total expenses
- Budget allocated vs actual spending
- Visual progress bars
- Trend indicators (up/down from previous period)
- Color-coded status (under budget/over budget/on track)

### 4. Budget Creation & Management

#### Monthly Budget Creation
**User Flow:**
1. Click "Create Monthly Budget" button
2. Modal opens with category allocation form
3. Set total monthly budget amount
4. Allocate amounts to each category
5. Real-time validation (allocations can't exceed total)
6. Calculate expected savings from (Total Income - Total budget amount)
7. Save and apply to current/future months

**Form Structure:**
```typescript
interface MonthlyBudget {
  id: string
  user_id: string
  year: number
  month: number
  total_budget: number
  categories: {
    category_id: string
    allocated_amount: number
    spent_amount: number
  }[]
}
```

#### Yearly Budget Creation
**User Flow:**
1. Click "Create Yearly Budget" button
2. Multi-step wizard opens:
   - Step 1: Set total yearly budget
   - Step 2: Distribute across 12 months
   - Step 3: Allocate categories per month
   - Step 4: Review and confirm
3. Option to apply template across all months
4. Save and generate monthly budgets automatically

### 5. Interactive Data Visualization

#### Spending Trend Chart
- Line/bar chart showing spending over selected time period
- Multiple data series (Income, Expenses, Budget)
- Interactive tooltips with detailed breakdown
- Responsive design for mobile devices

#### Category Breakdown Charts
- Pie chart showing expense distribution by category
- Donut chart with budget vs actual spending
- Category comparison bars

### 6. Category Management
**Features:**
- Create custom budget categories
- Edit existing category names/colors
- Merge categories (move transactions)
- Archive unused categories
- Set category icons and colors
- Category-specific budget rules

## Component Architecture

### Page Structure
```
/app/spending/breakdown/page.tsx
├── BudgetOverview (Server Component)
├── TimeRangeFilter (Client Component)
├── CategoryBreakdown (Server Component)
│   ├── CategoryList (Client Component)
│   └── CategoryItem (Client Component)
├── BudgetCreation (Client Component)
│   ├── MonthlyBudgetModal
│   └── YearlyBudgetWizard
├── SpendingCharts (Client Component)
└── TransactionsList (Server Component)
```

### Key Components

#### 1. BudgetOverview Component
```typescript
interface BudgetOverviewProps {
  timeRange: 'weekly' | 'monthly' | 'yearly'
  data: FinancialOverview
}
```
- Display total income, expenses, net cash flow
- Budget progress indicators
- Quick action buttons (Create Budget, View Details)

#### 2. CategoryBreakdown Component
```typescript
interface CategoryBreakdownProps {
  categories: CategoryData[]
  timeRange: string
  onCategoryEdit: (categoryId: string) => void
}
```
- Sortable category list (by amount, percentage, name)
- Budget vs actual indicators
- Quick category management actions

#### 3. BudgetCreationModal Component
```typescript
interface BudgetCreationModalProps {
  type: 'monthly' | 'yearly'
  existingBudget?: Budget
  onSave: (budget: Budget) => void
}
```
- Form validation with Zod schema
- Real-time allocation calculations
- Template options for quick setup

## UI/UX Requirements

### Design System
- Follow existing MoneyFlow design patterns
- Use consistent spacing (Tailwind spacing scale)
- Implement proper loading states and error boundaries
- Mobile-first responsive design
- Accessibility compliance (ARIA labels, keyboard navigation)

### Visual Hierarchy
1. **Primary**: Financial overview cards with large numbers
2. **Secondary**: Time range filter and main action buttons  
3. **Tertiary**: Category breakdown list and charts
4. **Quaternary**: Detailed transaction lists and metadata

### Interaction Patterns
- Hover states for all interactive elements
- Loading skeletons for async operations
- Toast notifications for success/error feedback
- Smooth transitions between time periods
- Progressive disclosure for advanced features

## Data Management

### State Management Strategy
```typescript
// Server State (React Query)
const { data: overview } = useFinancialOverview(timeRange)
const { data: categories } = useCategoryBreakdown(timeRange)
const { data: budgets } = useBudgets(timeRange)

// Client State (React hooks)
const [timeRange, setTimeRange] = useState('monthly')
const [selectedCategory, setSelectedCategory] = useState(null)
const [showBudgetModal, setShowBudgetModal] = useState(false)
```

### API Endpoints

#### API Contract Specifications
- **Response Time SLA**: All endpoints must respond within 2 seconds
- **Error Handling**: Standardized error responses with Indonesian language support
- **Rate Limiting**: 100 requests per minute per user
- **Versioning**: API versioning strategy for future scalability

#### Budget Management
```typescript
// Get user budgets with currency support
GET /api/budgets?period=monthly&year=2024&month=1&currency=IDR
Response: {
  budgets: Budget[]
  total_allocated: number
  currency: string
  exchange_rates?: Record<string, number>
}

// Create budget with validation
POST /api/budgets
{
  category_id: string
  amount: number
  currency: string // ISO 4217 code
  period: 'monthly' | 'yearly'
  start_date: string // ISO 8601 format
  end_date: string
}
Response: {
  budget: Budget
  validation_errors?: ValidationError[]
}

// Update budget with conflict detection
PUT /api/budgets/:id
{
  amount?: number
  currency?: string
  start_date?: string
  end_date?: string
}
Response: {
  budget: Budget
  conflicts?: BudgetConflict[]
}

// Delete budget with dependency check
DELETE /api/budgets/:id
Response: {
  success: boolean
  dependencies?: string[]
}
```

#### Category Management
```typescript
// Get categories with localization
GET /api/categories?locale=id-ID&include_system=true
Response: {
  categories: Category[]
  system_categories: Category[]
  locale: string
}

// Create category with Indonesian validation
POST /api/categories
{
  name: string
  color: string
  icon: string
  parent_id?: string
  locale?: string
}
Response: {
  category: Category
  validation_errors?: ValidationError[]
}

// Update category with hierarchy validation
PUT /api/categories/:id
{
  name?: string
  color?: string
  icon?: string
  locale?: string
}
Response: {
  category: Category
  hierarchy_conflicts?: HierarchyConflict[]
}

// Delete category with usage check
DELETE /api/categories/:id
Response: {
  success: boolean
  usage_count: number
  migration_suggestions?: string[]
}
```

#### Transaction Analysis
```typescript
// Get transactions with Indonesian filtering
GET /api/transactions?period=monthly&year=2024&month=1&category_id=optional&currency=IDR&timezone=Asia/Jakarta
Response: {
  transactions: Transaction[]
  pagination: PaginationInfo
  summary: TransactionSummary
  processing_time_ms: number
}

// Get spending breakdown with currency conversion
GET /api/analytics/breakdown?period=monthly&year=2024&month=1&currency=IDR&timezone=Asia/Jakarta
Response: {
  breakdown: CategoryBreakdown[]
  total_spent: number
  currency: string
  conversion_rate?: number
  last_updated: string
}

// Get budget vs actual with performance metrics
GET /api/analytics/budget-comparison?period=monthly&year=2024&month=1&currency=IDR
Response: {
  comparisons: BudgetComparison[]
  overall_performance: PerformanceMetrics
  recommendations?: string[]
  processing_time_ms: number
}
```

#### Analytics & Reporting
```typescript
// Get spending trends with Indonesian market insights
GET /api/analytics/trends?period=6months&currency=IDR&locale=id-ID
Response: {
  trends: TrendData[]
  market_insights?: IndonesianMarketInsight[]
  forecast?: ForecastData
  confidence_level: number
}

// Get financial health score
GET /api/analytics/health-score?currency=IDR
Response: {
  score: number
  factors: HealthFactor[]
  recommendations: Recommendation[]
  benchmark_data?: IndonesianBenchmark
}

// Export data with Indonesian formatting
GET /api/analytics/export?format=csv&period=yearly&year=2024&locale=id-ID
Response: {
  download_url: string
  expires_at: string
  file_size: number
}
```

## Performance Optimization

### Critical Performance Requirements
- **Hard Requirement**: All operations must complete within 2 seconds
- Optimized for Indonesian internet infrastructure
- Progressive loading for slower connections

### Data Fetching Strategy
- Server-side data fetching for initial page load
- Client-side caching with React Query
- Optimistic updates for budget modifications
- Pagination for large transaction lists
- Efficient indexing for multi-user scalability

### Code Splitting
- Lazy load budget creation modals
- Separate chunks for chart libraries
- Progressive enhancement for advanced features
- Optimized bundle sizes for faster loading

## Security & Compliance Requirements

### Data Privacy & Security
- **GDPR Compliance**: Data processing consent and user rights management
- **Financial Data Security**: End-to-end encryption for sensitive financial data
- **Input Validation**: Comprehensive server-side validation for all user inputs
- **Rate Limiting**: API endpoint protection against abuse
- **Audit Trails**: Logging of all budget and transaction modifications
- **Session Management**: Secure session handling with automatic timeout

### Indonesian Market Compliance
- **Data Residency**: Consider local data storage requirements
- **Currency Regulations**: Compliance with Indonesian financial regulations
- **Privacy Laws**: Adherence to Indonesian data protection standards

## Technical Architecture & Scalability

### Database Performance
- **Indexing Strategy**: Optimized indexes for user queries and reporting
- **Query Optimization**: Efficient queries for large datasets
- **Connection Pooling**: Supabase connection management
- **Data Partitioning**: Strategy for scaling transaction data

### Caching & Performance
- **Client-side Caching**: React Query configuration for optimal performance
- **CDN Strategy**: Static asset delivery optimization
- **Real-time Updates**: WebSocket implementation for live budget tracking
- **Background Processing**: Async processing for heavy calculations

### Monitoring & Observability
- **Application Performance Monitoring (APM)**: Real-time performance tracking
- **Error Tracking**: Comprehensive error logging and alerting
- **User Analytics**: Privacy-focused usage analytics for Indonesian market
- **Performance Metrics**: SLA monitoring and alerting

### Deployment & DevOps
- **CI/CD Pipeline**: Automated testing and deployment
- **Feature Flags**: Gradual rollout capability for new features
- **Environment Management**: Development, staging, and production environments
- **Backup Strategy**: Automated backups with point-in-time recovery

## Business Logic & Edge Cases

### Budget Management Logic
- **Conflict Resolution**: Handling overlapping budget periods
- **Currency Conversion**: Real-time exchange rates for multi-currency support
- **Budget Templates**: Pre-defined budget categories for Indonesian users
- **Rollover Logic**: Handling unused budget amounts between periods

### Data Validation Rules
- **Amount Limits**: Reasonable limits for budget and transaction amounts
- **Date Validation**: Proper handling of fiscal years and Indonesian holidays
- **Category Validation**: Ensuring category consistency and hierarchy
- **Currency Validation**: ISO 4217 compliance and supported currencies

### Time Zone & Localization
- **Time Zone Handling**: Proper handling of Indonesian time zones (WIB, WITA, WIT)
- **Date Formatting**: Indonesian date format preferences
- **Number Formatting**: Indonesian number and currency formatting
- **Language Support**: Indonesian language support for UI elements

## Testing Requirements

### Unit Testing
- Test all utility functions with Indonesian-specific scenarios
- Test custom hooks with currency conversion logic
- Test component logic with multi-currency support
- Mock external dependencies and exchange rate APIs

### Integration Testing
- Test API endpoints with Indonesian market scenarios
- Test database operations with large datasets
- Test user workflows with various currencies
- Test chart rendering with Indonesian number formatting

### Performance Testing
- **Load Testing**: Simulate Indonesian user traffic patterns
- **Stress Testing**: Test system limits with large transaction volumes
- **Network Testing**: Test with varying Indonesian internet speeds
- **Mobile Testing**: Test on popular Indonesian mobile devices

### User Acceptance Testing
- Budget creation and modification flows with IDR
- Transaction categorization accuracy for Indonesian spending patterns
- Chart interactivity and responsiveness on mobile devices
- Indonesian language and cultural appropriateness
- Performance benchmarks meeting 2-second requirement

## Development Guidelines

### Code Organization
- Follow Next.js 14 app router conventions with Indonesian market considerations
- Use TypeScript strict mode with comprehensive type coverage
- Implement proper error boundaries with localized error messages
- Use consistent naming conventions supporting internationalization

### Component Structure
- Server components for data fetching with Indonesian timezone handling
- Client components for interactivity with currency formatting
- Shared components in `/components/ui` with localization support
- Feature-specific components in `/components/budget` with Indonesian UX patterns

### State Management
- React Query for server state with Indonesian market caching strategies
- useState/useReducer for local state with currency conversion
- Context for shared UI state including locale and currency preferences
- Zustand for complex client state with Indonesian user behavior patterns

### Documentation Standards
- **API Documentation**: OpenAPI/Swagger specifications with Indonesian examples
- **Component Documentation**: Storybook with Indonesian use cases and currency scenarios
- **Database Documentation**: Schema documentation with migration guides and indexing strategies
- **Deployment Documentation**: Environment-specific deployment guides for Indonesian infrastructure
- **User Documentation**: Indonesian language user guides and help documentation

### Feature Flags Strategy
- **Gradual Rollout**: Progressive feature deployment for Indonesian users
- **A/B Testing**: Testing Indonesian-specific features and UX patterns
- **Emergency Rollback**: Quick rollback capability for critical issues
- **Market-specific Features**: Toggle features based on user location and preferences
- **Performance Flags**: Enable/disable features based on performance metrics

### Testing Data Sets
- **Indonesian Scenarios**: Test data reflecting Indonesian spending patterns and categories
- **Currency Test Data**: Multi-currency transaction scenarios with IDR focus
- **Performance Test Data**: Large datasets simulating Indonesian user scale
- **Edge Case Data**: Boundary conditions, network failures, and error scenarios
- **Localization Test Data**: Indonesian language, date formats, and cultural scenarios

## User Experience & Accessibility

### Onboarding Experience
- **First-time User Flow**: Guided setup for Indonesian users
- **Budget Template Selection**: Pre-configured budgets for Indonesian lifestyle
- **Currency Setup**: Default to IDR with multi-currency explanation
- **Category Initialization**: Indonesian-relevant expense categories

### Accessibility Requirements
- **WCAG 2.1 AA Compliance**: Full accessibility compliance
- **Screen Reader Support**: Comprehensive screen reader compatibility
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: High contrast mode for visual accessibility
- **Font Scaling**: Support for large text and zoom levels

### Offline Capabilities
- **Progressive Web App (PWA)**: Offline functionality for basic operations
- **Data Synchronization**: Sync when connection is restored
- **Offline Indicators**: Clear offline status communication
- **Cached Data**: Essential data available offline

### Multi-device Synchronization
- **Real-time Sync**: Changes reflected across devices immediately
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Device Management**: User can see and manage connected devices
- **Selective Sync**: User control over what data syncs

### User Preferences
- **Currency Preferences**: Primary and secondary currency settings
- **Language Settings**: Indonesian/English language toggle
- **Date Format**: Indonesian date format preferences
- **Notification Settings**: Customizable alert preferences
- **Theme Settings**: Light/dark mode with system preference detection

### Help & Support System
- **In-app Help**: Contextual help and tooltips in Indonesian
- **FAQ Section**: Common questions for Indonesian users
- **Contact Support**: Multiple support channels
- **Feature Tutorials**: Interactive tutorials for new features
- **Community Support**: User community and forums

## Migration & Data Management

### Database Migration Strategy
- **Zero-downtime Migrations**: Seamless schema updates
- **Rollback Procedures**: Safe rollback for failed migrations
- **Data Validation**: Post-migration data integrity checks
- **Performance Impact**: Monitor migration performance impact

### Data Import/Export
- **CSV Import**: Support for Indonesian bank statement formats
- **Data Export**: Multiple formats with Indonesian formatting
- **Backup Creation**: User-initiated data backups
- **Data Portability**: Easy data migration between accounts

### Error Handling & Recovery
- **Graceful Degradation**: Partial functionality during issues
- **Error Reporting**: User-friendly error messages in Indonesian
- **Automatic Recovery**: Self-healing for transient issues
- **Manual Recovery**: User tools for data recovery

## Internationalization (i18n)

### Language Support
- **Primary Language**: Indonesian (Bahasa Indonesia)
- **Secondary Language**: English
- **RTL Support**: Future-ready for Arabic/Hebrew if needed
- **Pluralization**: Proper Indonesian pluralization rules

### Cultural Considerations
- **Number Formatting**: Indonesian number format (1.234.567,89)
- **Currency Display**: IDR symbol placement and formatting
- **Date Formats**: Indonesian date format preferences
- **Cultural Colors**: Colors appropriate for Indonesian culture
- **Local Holidays**: Indonesian holiday calendar integration

### Regional Adaptations
- **Time Zones**: Support for WIB, WITA, WIT
- **Regional Categories**: Location-specific expense categories
- **Local Banking**: Integration with Indonesian banking systems
- **Government Compliance**: Indonesian financial regulations compliance
