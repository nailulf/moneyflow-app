'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Loader2,
  MailCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import {
  convertWithEmail,
  convertWithOAuth,
  finalizePendingOAuthDraft,
  resendConfirmation,
} from '@/lib/onboarding/convert'
import { useFunnelStore } from '@/lib/onboarding/funnel-store'
import { buildOnboardingDraft } from '@/lib/onboarding/build-draft'
import { ensureAnonymousSession } from '@/lib/supabase/anonymous'
import { OAUTH_FINALIZE_PARAM, hasPendingDraft } from '@/lib/onboarding/pending-draft'

/** Brand glyph for the Google OAuth button (lucide has no brand icons). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/** Brand glyph for the Apple OAuth button. */
function AppleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 fill-current"
      aria-hidden="true"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Conversion & auth screen (design Row C) — the funnel's terminal step.
 *
 * The goal flow's "Save my plan", the health check's "Create an account", and
 * the guest signup walls all route here. Converting keeps the SAME anon
 * user_id (see `@/lib/onboarding/convert`), so the guest's goal/plan become
 * theirs. "Continue as guest" keeps them anonymous on the homepage.
 */
export default function ConvertPage() {
  const t = useTranslations('start.convert')
  const router = useRouter()
  const searchParams = useSearchParams()
  // The flow result pages (goal/budget/health) are the conversion point now —
  // they route straight here, so this screen opens directly on the form (no
  // separate "your plan is ready" intro that repeated the result).
  // `finalizing` is the post-OAuth landing state: we returned from the provider
  // and are materializing the persisted draft before entering the app.
  const [step, setStep] = useState<'form' | 'verify' | 'finalizing'>('form')
  // The email awaiting confirmation — captured when an email conversion lands
  // in the pending-verification state, so the verify view can show & resend it.
  const [pendingEmail, setPendingEmail] = useState('')
  // Guards against double-finalize: React 18 Strict Mode mounts effects twice in
  // dev, and a re-render shouldn't re-trigger the RPC. finalize is idempotent
  // server-side, but we still run it at most once per landing.
  const finalizeStarted = useRef(false)

  // ── Post-OAuth landing ─────────────────────────────────────────────────────
  // convertWithOAuth persisted the draft and pointed Supabase's redirectTo back
  // here with `?oauth_finalize=1`. The browser arrived back authenticated (the
  // /auth/callback route exchanged the code), so rehydrate the draft and
  // materialize it once, then continue into the app — the same end state as the
  // email path. If there's no pending draft (already finalized / direct visit),
  // do nothing and show the form.
  useEffect(() => {
    if (searchParams.get(OAUTH_FINALIZE_PARAM) !== '1') return
    if (!hasPendingDraft()) return
    if (finalizeStarted.current) return
    finalizeStarted.current = true

    setStep('finalizing')
    finalizePendingOAuthDraft()
      .then(() => {
        // Full reload so the authed shell picks up the new session + seeded data.
        window.location.assign('/?registered=1')
      })
      .catch(() => {
        // Leave the draft in place so a retry can re-run; drop back to the form
        // (the user is signed in, so they can also just continue as guest).
        finalizeStarted.current = false
        toast.error(t('form.errorGeneric'))
        setStep('form')
      })
  }, [searchParams, t])

  if (step === 'finalizing') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm leading-body-sm text-muted-foreground">
          {t('finalizing.message')}
        </p>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <VerifyStep
        t={t}
        email={pendingEmail}
        onContinue={() => router.push('/')}
      />
    )
  }

  return (
    <FormStep
      t={t}
      onBack={() => router.back()}
      onLogin={() => router.push('/login')}
      onConverted={() => window.location.assign('/')}
      onPendingVerification={(email) => {
        setPendingEmail(email)
        setStep('verify')
      }}
    />
  )
}

type T = ReturnType<typeof useTranslations<'start.convert'>>

/** step 'form' — "Create your account". */
function FormStep({
  t,
  onBack,
  onLogin,
  onConverted,
  onPendingVerification,
}: {
  t: T
  onBack: () => void
  onLogin: () => void
  onConverted: () => void
  onPendingVerification: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 6
  const canSubmit = emailValid && passwordValid && agreed && !submitting

  // Ensure an anonymous session exists so the email conversion (updateUser)
  // always has a user to upgrade — covers reaching the form without first
  // going through a flow that created one.
  useEffect(() => {
    ensureAnonymousSession().catch(() => {})
  }, [])

  // NOTE: Google/Apple providers must be enabled in Supabase Auth for these to
  // work — they're wired regardless. linkIdentity redirects the browser away,
  // wiping the in-memory funnel store, so we build the draft NOW and hand it to
  // convertWithOAuth, which persists it across the redirect. On return the
  // landing effect above rehydrates and finalizes it (same end state as email).
  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      const draft = buildOnboardingDraft(useFunnelStore.getState(), new Date())
      await convertWithOAuth(provider, draft)
    } catch {
      toast.error(t('form.oauthError'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailValid) {
      toast.error(t('form.invalidEmail'))
      return
    }
    if (!passwordValid) {
      toast.error(t('form.passwordTooShort'))
      return
    }
    setSubmitting(true)
    try {
      const draft = buildOnboardingDraft(useFunnelStore.getState(), new Date())
      const result = await convertWithEmail(email, password, draft)
      // Email conversions need confirmation; surface the verify state. The
      // merge (conflict) path lands in an existing, confirmed account → home.
      if (result.pendingVerification) {
        onPendingVerification(email)
        return
      }
      onConverted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('form.errorGeneric'))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      <header className="flex items-center py-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('form.back')}
          className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted/50"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <h1 className="text-2xl leading-title-3 font-bold text-foreground">
        {t('form.title')}
      </h1>
      <p className="mt-1.5 text-sm leading-body-sm text-muted-foreground">
        {t('form.subtitle')}
      </p>

      {/* OAuth buttons */}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
          onClick={() => handleOAuth('google')}
          disabled={submitting}
        >
          <GoogleIcon />
          {t('form.google')}
        </Button>
        <Button
          type="button"
          className="h-[52px] w-full gap-2 rounded-[14px] bg-foreground text-md text-background hover:bg-foreground/90"
          onClick={() => handleOAuth('apple')}
          disabled={submitting}
        >
          <AppleIcon />
          {t('form.apple')}
        </Button>
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs leading-caption text-muted-foreground">
          {t('form.divider')}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="convert-email">{t('form.emailLabel')}</Label>
          <Input
            id="convert-email"
            data-testid="convert-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('form.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-[14px]"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="convert-password">{t('form.passwordLabel')}</Label>
          <Input
            id="convert-password"
            data-testid="convert-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('form.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-[14px]"
          />
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 text-sm leading-body-sm text-foreground">
          <Checkbox
            id="convert-terms"
            data-testid="convert-terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5"
          />
          <span>{t('form.terms')}</span>
        </label>

        <Button
          type="submit"
          data-testid="convert-submit"
          className="mt-2 h-[52px] w-full rounded-[14px] text-md"
          disabled={!canSubmit}
        >
          {submitting && (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          {submitting ? t('form.submitting') : t('form.submit')}
        </Button>
      </form>

      {/* Log-in footer */}
      <p className="mt-6 text-center text-sm leading-body-sm text-muted-foreground">
        {t('form.loginPrompt')}{' '}
        <button
          type="button"
          onClick={onLogin}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('form.loginLink')}
        </button>
      </p>
    </div>
  )
}

/**
 * step 'verify' — "Check your email". Reached after an email conversion: the
 * user is already signed in on their own data (same user_id), but the new email
 * is unconfirmed until they click the link. We guide them without blocking app
 * access — they can resend or continue and confirm later.
 */
function VerifyStep({
  t,
  email,
  onContinue,
}: {
  t: T
  email: string
  onContinue: () => void
}) {
  const [resending, setResending] = useState(false)

  const handleResend = async () => {
    setResending(true)
    try {
      const ok = await resendConfirmation(email)
      if (ok) {
        toast.success(t('verify.resendSuccess'))
      } else {
        toast.error(t('verify.resendError'))
      }
    } catch {
      toast.error(t('verify.resendError'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-blue-bg text-tint-blue-fg">
        <MailCheck className="h-8 w-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl leading-title-3 font-bold text-foreground">
        {t('verify.title')}
      </h1>
      <p className="mt-2 max-w-xs text-sm leading-body-sm text-muted-foreground">
        {t('verify.body', { email })}
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-[52px] w-full rounded-[14px] text-md"
          onClick={handleResend}
          disabled={resending}
        >
          {resending && (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          {resending ? t('verify.resending') : t('verify.resendCta')}
        </Button>
        <button
          type="button"
          onClick={onContinue}
          className="py-2 text-sm leading-body-sm font-medium text-primary hover:text-primary/80"
        >
          {t('verify.continueCta')}
        </button>
      </div>
    </div>
  )
}
