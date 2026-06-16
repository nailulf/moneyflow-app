'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils/site-url'
import { Button } from '@/components/ui/atoms/button'

/**
 * Verify-email (post-signup "check your inbox"), funnel-styled.
 *
 * Restyled + relocated out of the legacy (auth) two-column shell to match the
 * rebuilt `/login`. Logic is preserved verbatim: reads the `?email=` query
 * param, resends the signup confirmation via
 * `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo:
 * <site>/auth/callback } })`, and enforces the same 60s resend countdown.
 */
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
    <div className="flex flex-1 flex-col px-5 pb-5 pt-8">
      {/* Brand / status icon */}
      <header className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] bg-card shadow-card">
          <MailCheck className="h-7 w-7 text-primary" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl leading-title-3 font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-balance text-sm leading-body-sm text-muted-foreground">
          {t('description')}{' '}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            t('fallbackEmail')
          )}
          . {t('clickToFinish')}
        </p>
      </header>

      {/* Inbox hint */}
      <div className="mt-6 rounded-[14px] bg-muted/50 p-4 text-center text-sm leading-body-sm text-muted-foreground">
        {t('instruction')}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-[52px] w-full rounded-[14px] text-md"
          onClick={handleResendEmail}
          disabled={isLoading || countdown > 0 || !email}
        >
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          {countdown > 0 ? t('resendCountdown', { countdown }) : t('resendButton')}
        </Button>
      </div>

      {/* Footer → back to login */}
      <p className="mt-auto pt-6 text-center text-sm leading-body-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
