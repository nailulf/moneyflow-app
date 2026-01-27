'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { QueryProvider } from '@/lib/providers/query-provider'
import { GalleryVerticalEnd, Loader2 } from 'lucide-react'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <QueryProvider>
      <OnboardingProvider>
        <div className="min-h-svh bg-gradient-to-br from-green-50 to-blue-50">
          {/* Header */}
          <header className="border-b bg-white/80 backdrop-blur-sm">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <GalleryVerticalEnd className="h-5 w-5" />
                </div>
                <span className="font-semibold text-lg">MoneyFlow</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t bg-white/50 backdrop-blur-sm py-4">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              Need help? Contact us at support@moneyflow.app
            </div>
          </footer>
        </div>
      </OnboardingProvider>
    </QueryProvider>
  )
}
