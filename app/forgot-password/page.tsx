'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Loader2, MailCheck } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils/site-url'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { LocaleToggle } from '@/components/features/onboarding/LocaleToggle'

/**
 * Forgot-password (request reset link), funnel-styled.
 *
 * Restyled + relocated out of the legacy (auth) two-column shell to match the
 * rebuilt `/login`. Logic is preserved verbatim: it calls
 * `supabase.auth.resetPasswordForEmail(email, { redirectTo:
 * <site>/auth/callback?next=/account/reset-password })`. On success it now shows
 * a clean inline confirmation state instead of redirecting to `/login`.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword')
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const forgotPasswordSchema = z.object({
    email: z.string().email({ message: t('errors.invalidEmail') }),
  })

  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${getSiteUrl()}/auth/callback?next=/account/reset-password`,
      })

      if (error) {
        throw error
      }

      toast.success(t('successEmailSent'))
      setSentTo(data.email)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      toast.error(message || t('errorFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-5 pt-8">
      {/* Locale switch — absolutely positioned (adds no layout height). */}
      <LocaleToggle className="absolute right-5 top-5 z-10" />

      {/* Brand */}
      <header className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] bg-card shadow-card">
          {sentTo ? (
            <MailCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          ) : (
            <Image
              src="/icons/icon.png"
              alt="Teman Tumbuh"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          )}
        </span>
        <h1 className="mt-4 text-2xl leading-title-3 font-bold text-foreground">
          {sentTo ? t('successTitle') : t('title')}
        </h1>
        <p className="mt-1 text-balance text-sm leading-body-sm text-muted-foreground">
          {sentTo ? (
            <>
              {t('successBody')}{' '}
              <span className="font-medium text-foreground">{sentTo}</span>
            </>
          ) : (
            t('subtitle')
          )}
        </p>
      </header>

      {sentTo ? (
        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-[52px] w-full rounded-[14px] text-md"
            onClick={() => setSentTo(null)}
          >
            {t('resend')}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="forgot-email">{t('email')}</Label>
            <Input
              id="forgot-email"
              data-testid="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('emailPlaceholder')}
              className="h-[52px] rounded-[14px]"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm leading-body-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            data-testid="forgot-submit"
            className="mt-2 h-[52px] w-full rounded-[14px] text-md"
            disabled={isLoading || !isValid}
          >
            {isLoading && (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            )}
            {isLoading ? t('submitting') : t('submit')}
          </Button>
        </form>
      )}

      {/* Footer → back to login */}
      <p className="mt-auto pt-6 text-center text-sm leading-body-sm text-muted-foreground">
        {t('rememberPassword')}{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
