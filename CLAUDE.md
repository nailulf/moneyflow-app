# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start Next.js development server with webpack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives
- **State Management**: React Context + Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts, Nivo (Sankey)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + React Testing Library
- **AI Integration**: OpenAI API for statement parsing

## Architecture Overview

### Directory Structure

```
app/                    # Next.js App Router pages
├── (auth)/            # Auth route group (login, register, etc.)
├── spending/          # Spending-related pages
├── portfolio/         # Portfolio/investment pages
├── charts/            # Chart visualization pages
└── ...

components/            # React components
├── ui/               # Radix UI-based design system components
└── [feature].tsx     # Feature-specific components

lib/                   # Core utilities and logic
├── supabase/         # Supabase client configurations
│   ├── client.ts     # Browser client
│   ├── server.ts     # Server component client
│   └── middleware.ts # Middleware client
├── api/              # API service layer (transactions, budgets, etc.)
├── bank-parsers/     # Bank statement parser types
└── [utilities].ts    # Various utility functions

contexts/             # React Context providers
hooks/               # Custom React hooks
types/               # TypeScript type definitions
├── database.ts      # Supabase database schema types
└── ...

supabase/migrations/ # Database migration files
```

### Authentication & Data Access Patterns

**Supabase Client Creation:**
- Browser components: Use `lib/supabase/client.ts` → `createClient()`
- Server components: Use `lib/supabase/server.ts` → `createClient()` (async)
- Middleware: Use `lib/supabase/middleware.ts`

All Supabase clients are typed with `Database` type from `types/database.ts`.

### Database Schema

Core tables:
- `transactions` - Financial transactions with categorization, recurring support
- `categories` - User categories (linked to category_groups)
- `category_groups` - Category groupings (EXPENSE, INCOME, TRANSFER)
- `budgets` - Budget definitions (monthly/yearly)
- `budget_categories` - Budget allocations per category
- `accounts` - User financial accounts
- `statements` - Uploaded bank statement metadata
- `user_preferences` - User preference key-value store

### State Management Architecture

1. **React Query** (`@tanstack/react-query`) - Primary server state management with automatic caching, pagination, and invalidation
2. **React Context** (`contexts/`) - Provides backward-compatible API wrapping React Query
3. **Custom Hooks** (`hooks/`) - Encapsulates business logic and API interactions

**Transaction Management**:
```typescript
// New approach (React Query) - Recommended
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
const { transactions, isLoading } = useAllTransactions({ userId })

// Legacy approach (Context) - Still works, wraps React Query
import { useTransactions } from '@/contexts/TransactionContext'
const { transactions, loading } = useTransactions()
```

**Key Features**:
- Automatic pagination (100 transactions per page)
- Background loading for remaining pages
- Optimistic updates support
- Automatic cache invalidation on mutations
- Request deduplication
- See `TRANSACTION_PAGINATION_IMPROVEMENTS.md` for details

### Bank Statement Processing

The app uses AI-powered statement parsing:
- `lib/statement-parser.ts` - OpenAI-based transaction extraction
- `UnifiedStatementProcessor.tsx` - UI component for upload and processing
- Requires `OPENAI_API_KEY` environment variable
- Parses PDFs using `pdfjs-dist` with custom webpack configuration

### Design System

**Semantic Color System:**
- Uses CSS variables (HSL format) defined in `app/globals.css`
- Tailwind config extends with semantic tokens: `primary`, `secondary`, `destructive`, `success`, `warning`, `muted`, `accent`, `auth.*`
- Auth pages use dedicated `auth.*` color palette (see `PRODUCT_REQUIREMENTS.md`)

**Component Library:**
- All UI components in `components/ui/` follow Radix UI patterns
- Use `cn()` utility from `lib/utils.ts` for className merging

## Important Patterns

### Path Aliases
- `@/*` resolves to project root (configured in `tsconfig.json`)
- Always use `@/` imports, e.g., `import { createClient } from '@/lib/supabase/client'`

### Transaction Type Convention
Transaction types are uppercase string literals: `'INCOME' | 'EXPENSE' | 'TRANSFER'`

### Recurring Transactions
Transactions support recurring patterns with:
- `is_recurring` boolean
- `recurring_frequency`: 'daily' | 'weekly' | 'monthly' | 'yearly'
- `recurring_end_date` and `last_processed_date` fields
- Processing logic in `lib/recurring-processor.ts`
- **Automated via GitHub Actions**: `.github/workflows/recurring-transactions.yml` runs daily at midnight UTC
- API endpoint: `POST /api/recurring-transactions` (requires `CRON_SECRET` authorization)
- See `RECURRING_TRANSACTIONS.md` for detailed setup and troubleshooting

### Budget Allocation
Budget allocation logic separates:
- Budget creation (`lib/budget-utils.ts`)
- Budget validation (`lib/budget-validation.ts`)
- Budget allocation algorithms (`lib/budget-allocation.ts`)

## Environment Setup

Required environment variables (see `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=  # For AI statement parsing
CRON_SECRET=      # For recurring transaction cron authentication
```

GitHub Secrets (for recurring transactions):
```
CRON_SECRET=      # Same value as Vercel
APP_URL=          # Your Vercel deployment URL
```

## PDF Processing Configuration

The app uses `pdfjs-dist` for PDF parsing with special webpack configuration:
- `next.config.js` includes webpack alias for PDF.js worker
- `serverExternalPackages: ['pdfjs-dist']` prevents bundling on server

## Testing Approach

- Test files in `__tests__/` directory
- Uses `@testing-library/react` for component testing
- Mock data available in `lib/mock-data.ts` and `lib/mock-chart-data.ts`
- Test pattern: `**/__tests__/**/*.test.{ts,tsx}`

## Database Migrations

Migrations are in `supabase/migrations/` with sequential numbering:
- Format: `NNN_description.sql`
- Run via Supabase CLI or dashboard
- Schema types in `types/database.ts` should match latest migrations
