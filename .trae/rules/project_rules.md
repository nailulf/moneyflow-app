Rendering Strategy: Hybrid SSR + CSR
- SSR Pages: Dashboard, analytics (better SEO, faster initial load)
- CSR Components: File uploads, transaction editing (better interactivity)
- Next.js App Router - Server components by default, client components when needed

UI Theme grid system
- Sidebar: 15% of display view when maximized
- Content area: 85% of display view (remaining space)
- Within content area: Responsive margins (3%-15%) + main content card + metrics card + responsive margins (3%-15%)
- Content grid: 80% on larger displays, 90% on smaller displays
- Card ratio: 2.5:1 (main content to metrics card)
- Responsive margins: Max 15% on large displays, min 3% on small displays
- Card placement: Main content and metrics cards can be swapped based on page needs
- Card consistency: Maintain consistent width ratios, spacing, and styling across all pages

Navigation
- Left sidebar: Main navigation for all pages (max 15% width of display view, min 10% width on small displays when maximized)
- Top navigation: Page-specific sub-menus
  - Dashboard: Title only (no sub-menu)
  - Spending: Overview, Breakdown, Transaction
  - Portfolio: Overview, Holdings, Analytics
- Top right navigation: User navigation using nav-user component
- No breadcrumbs required

Frontend
- Next.js 14 + TypeScript - App Router with server components
- Tailwind CSS - Utility-first styling
- Shadcn/ui - Server-compatible UI components, maintain proper Shadcn UI management using `npx shadcn@latest add` for new components.
- Structure project as Progressive Web App (PWA) with offline capabilities, app-like experience, and installability across devices.
- Use Zustand for state management in client components when necessary.
- React Hook Form + Zod - Client-side forms and validation
- React Query/TanStack Query - Client-side data fetching and caching
- Emphasize server-side logic, minimizing the usage of `use client` and other client-only APIs.

Backend (All Supabase)
- Supabase Database - PostgreSQL with real-time subscriptions
- Supabase Auth - Server-side authentication
- Supabase Storage - File uploads with server-side processing
- Supabase Edge Functions - Deno-based serverless functions

Deployment
- Vercel - Static generation + serverless functions
- Supabase - Backend infrastructure with edge locations