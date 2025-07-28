Rendering Strategy: Hybrid SSR + CSR
- SSR Pages: Dashboard, analytics (better SEO, faster initial load)
- CSR Components: File uploads, transaction editing (better interactivity)
- Next.js App Router - Server components by default, client components when needed

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