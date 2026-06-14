'use client'

import { useEffect } from 'react'
import { AppSidebar } from '@/components/features/navigation/app-sidebar'
import { NavUser } from '@/components/features/navigation/nav-user'
import { Toaster } from '@/components/ui/atoms/sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/organisms/sidebar'
import { Separator } from '@/components/ui/atoms/separator'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AccountProvider } from '@/contexts/AccountContext'
import { CategoryProvider } from '@/contexts/CategoryContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TransactionProvider } from '@/contexts/TransactionContext'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider'
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal'
import { Loader2 } from 'lucide-react'
import { MobileScreenHeader } from '@/components/features/navigation/MobileScreenHeader'
import { MobileBottomNav } from '@/components/features/navigation/MobileBottomNav'
import { isFullScreenFlow } from '@/lib/nav-visibility'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { preferences } from '@/lib/api/user-preferences'
import { setLocaleCookie } from '@/lib/actions/locale'
import { Analytics } from '@/lib/analytics/amplitude'

interface LayoutWrapperProps {
  children: React.ReactNode
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const locale = useLocale()
  const t = useTranslations('layout.pageTitle')

  // Sync DB language preference → cookie once per user session
  useEffect(() => {
    if (!user) return
    preferences.getLanguage(user.id).then(async (dbLang) => {
      if (dbLang && dbLang !== locale) {
        await setLocaleCookie(dbLang)
        router.refresh()
      }
    })
  }, [user?.id])

  // Fire registration_completed after email verification callback lands here.
  // The /auth/callback route sets ?registered=1 on the redirect destination.
  useEffect(() => {
    if (searchParams.get('registered') !== '1') return
    Analytics.track('registration_completed', { timestamp: new Date().toISOString() })
    // Remove the param without a navigation so it doesn't fire again on refresh.
    const url = new URL(window.location.href)
    url.searchParams.delete('registered')
    window.history.replaceState({}, '', url.toString())
  }, [searchParams])

  // Standalone pages (auth + offline) render without the sidebar layout.
  // Checked before `loading` so /offline still renders when the auth fetch
  // can't resolve (no network).
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/auth') || pathname.startsWith('/verify-email') || pathname.startsWith('/offline')) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    // Middleware should handle redirect, but just in case
    return null
  }

  const pageTitle =
    pathname.startsWith('/spending') ? t('spending') :
    pathname.startsWith('/accounts') ? t('accounts') :
    pathname.startsWith('/portfolio') ? t('portfolio') :
    pathname.startsWith('/forecast') ? t('forecast') :
    pathname.startsWith('/budget') ? t('budget') :
    pathname.startsWith('/transactions') ? t('transactions') :
    pathname.startsWith('/charts') ? t('charts') :
    pathname === '/invest' ? t('invest') :
    pathname === '/advice' ? t('advice') :
    pathname === '/tax' ? t('tax') :
    pathname === '/equity' ? t('equity') :
    pathname === '/estate-planning' ? t('estatePlanning') :
    t('dashboard')

  // Screens that render their own mobile header (spec sub-project 1: screens
  // own their headers; this list shrinks the interim LayoutWrapper fallback).
  const ownsMobileHeader = pathname === '/' || pathname.startsWith('/transactions') || pathname.startsWith('/accounts') || pathname.startsWith('/budget') || pathname.startsWith('/portfolio')

  // MobileBottomNav hides itself on these routes — drop its clearance padding too.
  const hidesBottomNav = isFullScreenFlow(pathname)

  const navUserData = {
    name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.user_metadata.avatar_url || '/avatars/01.svg',
  }

  return (
    <SidebarProvider>
      <TransactionProvider>
        <AccountProvider>
          <CategoryProvider>
            <OnboardingProvider>
              <OnboardingModal />
              <AppSidebar className="hidden md:flex" />
              <SidebarInset>
          <header className="hidden h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:flex">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
            </div>
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
            <div className="ml-auto px-4">
              <NavUser user={navUserData} />
            </div>
          </header>
          {!ownsMobileHeader && <MobileScreenHeader title={pageTitle} user={navUserData} />}
          <div className={cn('flex flex-1 flex-col gap-4 p-4 pt-0 md:pb-4', hidesBottomNav ? 'pb-4' : 'pb-28')}>
            <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
              {children}
            </div>
          </div>
        </SidebarInset>
        <MobileBottomNav />
            </OnboardingProvider>
          </CategoryProvider>
        </AccountProvider>
      </TransactionProvider>
      <Toaster />
    </SidebarProvider>
  )
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </AnalyticsProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
