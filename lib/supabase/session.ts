import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/auth'
]

// Routes that are part of the onboarding flow
const onboardingRoutes = [
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
  const isOnboardingRoute = onboardingRoutes.some(route => pathname.startsWith(route))
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

  // If user is authenticated and accessing the main app (not onboarding routes)
  // Check onboarding status and redirect if needed
  if (
    user &&
    !isPublicRoute &&
    !isOnboardingRoute &&
    !isApiRoute &&
    !isNextRoute &&
    !isStaticFile &&
    pathname === '/' // Only check on dashboard for now to minimize DB calls
  ) {
    try {
      // Check onboarding status
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('is_completed, is_skipped, current_phase')
        .eq('user_id', user.id)
        .single()

      // If onboarding exists and is not completed/skipped, redirect to appropriate step
      if (onboarding && !onboarding.is_completed && !onboarding.is_skipped) {
        const url = request.nextUrl.clone()
        if (onboarding.current_phase === 'welcome') {
          url.pathname = '/welcome'
        } else if (onboarding.current_phase === 'completed') {
          url.pathname = '/complete'
        } else {
          url.pathname = '/setup'
        }
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If error checking onboarding (e.g., table doesn't exist yet), allow access
      console.error('Error checking onboarding status:', error)
    }
  }

  return response
}
