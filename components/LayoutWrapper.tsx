'use client'

import { useEffect } from 'react'
import { AppSidebar } from '@/components/features/navigation/app-sidebar'
import { NavUser } from '@/components/features/navigation/nav-user'
import { Toaster } from '@/components/ui/molecules/sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/organisms/sidebar'
import { Separator } from '@/components/ui/atoms/separator'
import { usePathname, useRouter } from 'next/navigation'
import { AccountProvider } from '@/contexts/AccountContext'
import { CategoryProvider } from '@/contexts/CategoryContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TransactionProvider } from '@/contexts/TransactionContext'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider'
import { OnboardingModal } from '@/components/features/onboarding/OnboardingModal'
import { Loader2, GalleryVerticalEnd } from 'lucide-react'
import { MobileBottomNav } from '@/components/features/navigation/MobileBottomNav'
import { useLocale, useTranslations } from 'next-intl'
import { preferences } from '@/lib/api/user-preferences'
import { setLocaleCookie } from '@/lib/actions/locale'

interface LayoutWrapperProps {
  children: React.ReactNode
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If we are on auth pages, don't show the sidebar layout
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/auth') || pathname.startsWith('/verify-email')) {
    return <>{children}</>
  }

  if (!user) {
    // Middleware should handle redirect, but just in case
    return null
  }

  const pageTitle =
    pathname === '/spending' || pathname.startsWith('/spending') ? t('spending') :
    pathname === '/accounts' || pathname.startsWith('/accounts') ? t('accounts') :
    pathname === '/portfolio' || pathname.startsWith('/portfolio') ? t('portfolio') :
    pathname === '/invest' ? t('invest') :
    pathname === '/advice' ? t('advice') :
    pathname === '/tax' ? t('tax') :
    pathname === '/equity' ? t('equity') :
    pathname === '/estate-planning' ? t('estatePlanning') :
    t('dashboard')

  return (
    <SidebarProvider>
      <TransactionProvider>
        <AccountProvider>
          <CategoryProvider>
            <OnboardingProvider>
              <OnboardingModal />
              <AppSidebar className="hidden md:flex" />
              <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4 md:hidden">
              <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
            </div>
            <h1 className="text-xl font-semibold md:pl-0">{pageTitle}</h1>
            <div className="ml-auto px-4">
              <NavUser user={{
                name: user.user_metadata.full_name || user.email?.split('@')[0] || "User",
                email: user.email || "",
                avatar: user.user_metadata.avatar_url || "/avatars/01.svg"
              }} />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-28 md:pb-4">
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
