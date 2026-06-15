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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
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
            request,
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

  // If no user and accessing protected route, redirect to login
  if (
    !user &&
    !isPublicRoute &&
    !isApiRoute &&
    !isNextRoute &&
    !isStaticFile
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
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
