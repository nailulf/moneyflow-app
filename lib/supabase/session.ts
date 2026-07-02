import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/auth',
  // Guest onboarding funnel: a logged-out visitor must reach /start/* without
  // a login redirect (an anonymous session is created lazily mid-funnel).
  '/start'
]

// Onboarding is now handled via modal on the dashboard
// These routes are kept for backwards compatibility but redirect to /
const legacyOnboardingRoutes = [
  '/welcome',
  '/setup',
  '/complete'
]

export async function updateSession(
  request: NextRequest,
  nonce?: string,
  csp?: string,
) {
  // Clone the current request headers and, when a CSP nonce is provided, attach it
  // so Next.js stamps `nonce="…"` onto its own <script> tags (required for the
  // 'strict-dynamic' policy set in proxy.ts). Cloning `request.headers` *after*
  // any cookie mutation also carries refreshed Supabase cookies to the render.
  const withSecurityHeaders = () => {
    const headers = new Headers(request.headers)
    if (nonce && csp) {
      headers.set('x-nonce', nonce)
      headers.set('content-security-policy', csp)
    }
    return headers
  }

  let response = NextResponse.next({
    request: {
      headers: withSecurityHeaders(),
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: withSecurityHeaders(),
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Check if route is public (doesn't require auth)
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isLegacyOnboardingRoute = legacyOnboardingRoutes.some(route => pathname.startsWith(route))
  const isApiRoute = pathname.startsWith('/api')
  const isNextRoute = pathname.startsWith('/_next')
  const isStaticFile = pathname.includes('.')

  // If no user and accessing protected route, redirect to the guest onboarding
  // funnel (the product "front door"). /login stays reachable via explicit
  // "Log in" links on /start and /start/save.
  if (
    !user &&
    !isPublicRoute &&
    !isApiRoute &&
    !isNextRoute &&
    !isStaticFile
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/start'
    return NextResponse.redirect(url)
  }

  // Redirect legacy onboarding routes to dashboard
  // Onboarding is now handled via modal on the dashboard
  if (user && isLegacyOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
