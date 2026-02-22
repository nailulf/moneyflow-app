# MoneyFlow App - Development Guidelines

## Architecture & Rendering Strategy

### Hybrid SSR + CSR Approach
- **SSR Pages**: Dashboard, analytics, portfolio overview (SEO optimization, faster initial load)
- **CSR Components**: File uploads, transaction editing, real-time charts (enhanced interactivity)
- **Next.js App Router**: Server components by default, client components only when necessary
- **Performance**: Prioritize Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)

## Design System & UI Guidelines

### Layout Grid System
- **Sidebar**: 15% width when maximized, 10% minimum on small displays
- **Content Area**: 85% width (remaining space after sidebar)
- **Content Grid**: 80% on large displays (≥1024px), 90% on small displays (<1024px)
- **Card Ratio**: 2.5:1 (main content to metrics card)
- **Responsive Margins**: 15% max on large displays, 3% min on small displays
- **Breakpoints**: Follow Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)

### PageLayout Components
- **TopContent**: Full-width card component that spans the entire content area width (MainContent + SideContent combined)
  - Mobile: 100% width with grid layout
  - Desktop: 100% width with flexbox column layout
  - Styling: Card appearance with background, border, shadow, and rounded corners
  - Overflow: Prevents content overflow with overflow-hidden
  - Spacing: Card padding (p-4 md:p-6) and bottom margin (mb-4)
  - Order: Always appears first (order-0) in the layout flow
- **ContentWrapper**: Container for MainContent and SideContent
  - Mobile: Grid layout (grid-cols-1) with gap-4
  - Desktop: Flexbox layout (sm:flex sm:justify-center) for side-by-side content
  - Order: Appears after TopContent (order-1)
- **MainContent**: Primary content area (80% width on large screens, 60-80% constraints)
  - Order: First within ContentWrapper (sm:order-1)
- **SideContent**: Secondary content area (20-30% width on large screens, 30-40% constraints)
  - Order: Second within ContentWrapper (sm:order-2)

#### Usage Example:
```tsx
<PageLayout>
  <TopContent>
    {/* Full-width header content */}
  </TopContent>
  <ContentWrapper>
    <MainContent>
      {/* Primary page content */}
    </MainContent>
    <SideContent>
      {/* Sidebar content */}
    </SideContent>
  </ContentWrapper>
</PageLayout>
```

### Component Design Standards
- **Card Consistency**: Uniform padding (p-4), border radius (rounded-lg), shadow (shadow-sm)
- **Spacing Scale**: Use Tailwind spacing scale consistently (4, 6, 8, 12, 16, 24)
- **Typography**: Consistent heading hierarchy (text-2xl, text-xl, text-lg, text-base)
- **Color Palette**: Stick to shadcn/ui color tokens for theme consistency
- **Interactive States**: Hover, focus, active, disabled states for all interactive elements

### Navigation Structure
- **Left Sidebar**: Main navigation (Dashboard, Spending, Portfolio, etc.)
- **Top Navigation**: Page-specific sub-menus
  - Dashboard: Title only (no sub-menu)
  - Spending: Overview, Breakdown, Transaction
  - Portfolio: Overview, Holdings, Analytics
  - Investment: Overview, Research, Recommendations
- **User Navigation**: Top-right corner using nav-user component
- **Mobile**: Collapsible sidebar with hamburger menu
- **Accessibility**: ARIA labels, keyboard navigation support

## Frontend Development Standards

### Technology Stack
- **Framework**: Next.js 15+ with TypeScript
- **Styling**: Tailwind CSS with consistent utility classes
- **Components**: Shadcn/ui exclusively - use `npx shadcn@latest add` for new components
- **State Management**: Zustand for client-side state, React Query for server state
- **Forms**: React Hook Form + Zod validation
- **PWA**: Offline capabilities, app-like experience, cross-device installability

### Code Organization
- **File Structure**: Group by feature, not by file type
- **Component Naming**: PascalCase for components, kebab-case for files
- **Import Order**: External libraries → Internal utilities → Components → Types
- **TypeScript**: Strict mode enabled, explicit return types for functions
- **Error Handling**: Consistent error boundaries and user feedback

### Performance Guidelines
- **Bundle Size**: Monitor and optimize chunk sizes
- **Images**: Use Next.js Image component with proper optimization
- **Lazy Loading**: Implement for non-critical components
- **Caching**: Leverage React Query for data caching strategies
- **Server Components**: Maximize usage to reduce client-side JavaScript

## Backend Architecture (Supabase)

### Database Design
- **PostgreSQL**: Normalized schema with proper indexing
- **Real-time**: Supabase subscriptions for live data updates
- **Security**: Row Level Security (RLS) policies for all tables
- **Migrations**: Version-controlled database schema changes

### Authentication & Authorization
- **Supabase Auth**: Server-side authentication with JWT tokens
- **Role-based Access**: User roles and permissions system
- **Session Management**: Secure session handling and refresh tokens

### File Management
- **Supabase Storage**: Organized bucket structure for different file types
- **Server-side Processing**: File validation and processing in Edge Functions
- **CDN**: Optimized delivery through Supabase CDN

### API Design
- **Edge Functions**: Deno-based serverless functions for business logic
- **RESTful**: Consistent API patterns and response formats
- **Error Handling**: Standardized error responses and logging

## Development Workflow

### Code Quality
- **ESLint**: Strict configuration with no warnings allowed in production builds
- **Prettier**: Consistent code formatting across the project
- **TypeScript**: Zero `any` types, comprehensive type coverage
- **Testing**: Unit tests for utilities, integration tests for critical flows
- **Typecheck Command**: `npx tsc --noEmit`

### Git Workflow
- **Branch Naming**: feature/description, fix/description, refactor/description
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Required reviews, automated checks must pass
- **Deployment**: Automatic deployment on main branch merge

### Documentation
- **Component Documentation**: Props, usage examples, accessibility notes
- **API Documentation**: Endpoint descriptions, request/response schemas
- **README**: Setup instructions, development guidelines, deployment process

## Deployment & Infrastructure

### Vercel Configuration
- **Static Generation**: Pre-render static pages where possible
- **Serverless Functions**: API routes for dynamic functionality
- **Environment Variables**: Secure configuration management
- **Analytics**: Performance monitoring and user analytics

### Supabase Infrastructure
- **Edge Locations**: Global distribution for optimal performance
- **Backup Strategy**: Automated daily backups with point-in-time recovery
- **Monitoring**: Database performance and API response time tracking
- **Scaling**: Auto-scaling configuration for traffic spikes

## Quality Assurance

### Testing Strategy
- **Unit Tests**: Jest + React Testing Library for components
- **Integration Tests**: End-to-end testing with Playwright
- **Performance Tests**: Lighthouse CI for performance regression detection
- **Accessibility Tests**: Automated a11y testing in CI pipeline

### Monitoring & Analytics
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Monitoring**: Real User Monitoring (RUM) implementation
- **User Analytics**: Privacy-focused usage analytics
- **Uptime Monitoring**: Service availability tracking
