'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils/site-url'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const t = useTranslations('auth.verifyEmail')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((c) => c - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [countdown])

  const handleResendEmail = async () => {
    if (!email) {
      toast.error(t('toasts.emailMissing'))
      return
    }

    if (countdown > 0) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      toast.success(t('toasts.sentSuccess'))
      setCountdown(60)
    } catch (error: unknown) {
      const authError = error as { message?: string; status?: number }
      if (authError.message?.includes('Too many requests') || authError.status === 429) {
        toast.error(t('toasts.rateLimited'))
        setCountdown(60)
      } else {
        toast.error(authError.message || t('toasts.sendFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('description')}{' '}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              'your email address'
            )}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground text-center">
        {t('instruction')}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendEmail}
          disabled={isLoading || countdown > 0 || !email}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {countdown > 0 ? t('resendCountdown', { countdown }) : t('resendButton')}
        </Button>

        <Link href="/login" className="w-full">
          <Button className="w-full gap-2">
            {t('backToLogin')} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="text-balance text-center text-xs text-muted-foreground">
        {t('needHelp')}{' '}
        <a href="#" className="underline hover:text-primary">
          {t('contactSupport')}
        </a>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
