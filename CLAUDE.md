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

> **📐 Backend/SSR rebuild blueprint:** For a deep, current map of the backend — full database
> schema, auth/sessions/RLS, the complete API surface + SSR coupling map, domain logic &
> business invariants, and jobs/integrations — see [`docs/architecture/`](docs/architecture/README.md).
> Read it before any backend extraction, shared-mobile-API, or rebuild work.

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
│   └── session.ts    # Session management
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
- Session Management: Use `lib/supabase/session.ts`

All Supabase clients are typed with `Database` type from `types/database.ts`.

### Database Schema

Core tables (full schema, RLS, triggers & invariants in [`docs/architecture/01-data-model.md`](docs/architecture/01-data-model.md)):
- `transactions` - Financial transactions (categorization, recurring, transfers via `to_account_id`)
- `categories` / `category_groups` - User categories and their groupings (EXPENSE, INCOME, TRANSFER)
- `accounts` - Financial accounts & physical assets (BANK, CREDIT_CARD, CASH, INVESTMENT, PROPERTY, VEHICLE, MORTGAGE)
- `budget_plans` / `budget_plan_categories` - **Current** budget model (one rolling plan per period type)
- `budget_snapshots` / `budget_snapshot_categories` - Point-in-time budget archives (immutable; INSERT+SELECT only)
- `budgets` / `budget_categories` - **Legacy** budget tables (still present; superseded by budget plans/snapshots)
- `statements` - Uploaded bank statement metadata (file bytes are never persisted)
- `financial_goals` - Per-account savings goals (one per account)
- `wealth_forecast_scenarios` / `wealth_forecast_events` - Net-worth forecasting inputs
- `account_balance_adjustments` - Immutable manual balance-correction audit log
- `user_settings` - **Wide** per-user settings table (replaced the legacy `user_preferences` EAV table in migration 030)
- `user_onboarding` / `onboarding_events` - Onboarding state and funnel events

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

Tokens are defined as HSL CSS variables in `app/globals.css` and exposed as Tailwind utilities in
`tailwind.config.js`. **Always style with these semantic tokens — never hardcoded Tailwind colors
(`text-red-600`), hex codes, or arbitrary px.** The font/line-height tokens are responsive
(mobile → tablet ≥640px → desktop ≥1024px). For frontend work, the **[moneyflow-frontend skill](.claude/skills/moneyflow-frontend/SKILL.md)**
auto-applies these rules; the exhaustive token dump (dark mode, charts, sidebar) lives in its
[`references/design-system.md`](.claude/skills/moneyflow-frontend/references/design-system.md).

**Brand palette** (hardcoded hex on auth pages via `auth.*` tokens; mirrored by the semantic system):
`#205781` deep blue (= `primary`) · `#98D2C0` mint (= `accent`) · `#F6F8D5` pale yellow (`auth.card`).

**Color map** — semantic token (Tailwind class) → `H S% L%` light / dark → use:

| Token | Light | Dark | Use (≈hex light) |
|---|---|---|---|
| `background` / `foreground` | `0 0% 100%` / `222 84% 4.9%` | inverted | page bg / text (`#FFF` / `#020817`) |
| `card`, `popover` (+`-foreground`) | = background pair | = background pair | surfaces |
| `primary` (+`-foreground`) | `206 60% 31.6%` | `161 39% 71%` | brand actions (`#205781`; mint in dark) |
| `secondary` | `186 33% 46%` | same | muted teal |
| `accent` | `161 39% 71%` | `206 60% 31.6%` | highlights (`#98D2C0`; blue in dark) |
| `muted` / `muted-foreground` | `210 40% 96%` / `215 16% 47%` | `217 33% 17.5%` / `215 20% 65%` | subtle bg / secondary text (`#64748B`) |
| `destructive` | `0 84% 60%` | same | errors/expense (`#EF4444`) |
| `success` | `142 76% 36%` | `142 71% 45%` | income/positive (`#16A34A`) |
| `warning` | ⚠ **undefined** | `48 96% 53%` | ⚠ light-mode gap (`#FACC15` dark only) |
| `border` / `input` / `ring` | `214 32% 91%` / `…` / `206 60% 31.6%` | `217 33% 17.5%` / `…` / `161 39% 71%` | borders/focus (`#E2E8F0`) |
| `chart-1`…`chart-5` | data-viz palette | separate dark palette | charts: `hsl(var(--chart-N))` |

**Font map** — `text-{token}` (px at mobile / tablet / desktop). Tokens carry **no** bundled
line-height — always pair with a `leading-*` class:

| Class | Mobile | Tablet | Desktop |  | Class | px |
|---|---|---|---|---|---|---|
| `text-xs` | 12 | 12 | 12 |  | `leading-title-1` | 40/48/56 |
| `text-sm` | 14 | 14 | 14 |  | `leading-title-2` | 32/36/40 |
| `text-md` | 16 | 16 | 16 |  | `leading-title-3` | 28/30/32 |
| `text-lg` | 16 | 17 | 18 |  | `leading-title-4`/`-5` | 24/26/28 |
| `text-xl` | 18 | 20 | 20 |  | `leading-body-lg` | 24 |
| `text-2xl` | 20 | 22 | 24 |  | `leading-body-sm` | 20 |
| `text-3xl` | 24 | 28 | 32 |  | `leading-caption` | 20 |
| `text-4xl` | 32 | 40 | 48 |  | | |

(The `text-[length:var(--font-size-*)]` / `leading-[var(--leading-*)]` arbitrary-value forms are
equivalent but the utility classes above are the live convention.)

**Other rules:** icons via `lucide-react` (never emojis); hover/active states use semantic tokens
with opacity (`hover:bg-muted/50`, `hover:bg-destructive/10`); dark mode is `class`-based (`.dark`).

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
- **Automated via GitHub Actions**: `.github/workflows/recurring-transactions-cron.yml` runs daily at 02:00 UTC (sibling crons: `budget-snapshots-cron.yml` monthly, `exchange-rate-snapshot-cron.yml` weekly)
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

## Database Design Principles

### Prefer Wide Tables over EAV

**Always use wide (columnar) tables** for feature data. Do not use EAV (Entity-Attribute-Value) or generic key-value patterns unless there is no alternative.

**Why:**
- Each attribute becomes a typed column — the database enforces types, constraints, and defaults
- Single-row queries per entity instead of multiple key lookups
- TypeScript types map 1-to-1 with DB columns — no runtime casting or silent key typos
- Query performance: filters, joins, and indexes work on real columns, not JSON blobs
- Easier to audit, migrate, and extend

**Wide table example (correct):**
```sql
CREATE TABLE user_settings (
  user_id          UUID PRIMARY KEY,
  language         TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'id')),
  default_currency TEXT NOT NULL DEFAULT 'IDR',
  theme            TEXT NOT NULL DEFAULT 'system',
  -- add new preferences as new columns
);
```

**EAV pattern (avoid):**
```sql
-- Do not do this
CREATE TABLE user_preferences (
  user_id          UUID,
  preference_key   TEXT,   -- 'language', 'default_currency', etc.
  preference_value JSONB
);
```

**When EAV is acceptable:**
- Truly dynamic, user-defined attributes (e.g., custom metadata tags the user invents at runtime)
- Schema is genuinely unknown at design time
- Even then, prefer a single `extras JSONB` overflow column on a wide table rather than a full EAV table

**Existing exception:** `user_preferences` table is legacy EAV and is being migrated to `user_settings` (wide table). New features must not follow the old pattern.

### Immutable Audit Logs

For audit/history tables (e.g., `account_balance_adjustments`), enforce immutability at the DB level:
- Grant only SELECT + INSERT RLS policies — no UPDATE or DELETE
- Never add an `UPDATE` policy to a log table
- The `Update` type in `types/database.ts` should be `Record<string, never>`
