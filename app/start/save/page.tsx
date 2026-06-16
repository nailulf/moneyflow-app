'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  PartyPopper,
  Target,
  Flame,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import {
  convertWithEmail,
  convertWithOAuth,
  continueAsGuest,
} from '@/lib/onboarding/convert'

/** Benefit rows for the "Your plan is ready" celebration — each gets its own tint. */
const BENEFITS: Array<{
  icon: LucideIcon
  titleKey: string
  subKey: string
  tint: string
}> = [
  {
    icon: Target,
    titleKey: 'intro.benefitGoalTitle',
    subKey: 'intro.benefitGoalSub',
    tint: 'bg-tint-blue-bg text-tint-blue-fg',
  },
  {
    icon: Flame,
    titleKey: 'intro.benefitStreakTitle',
    subKey: 'intro.benefitStreakSub',
    tint: 'bg-tint-amber-bg text-tint-amber-fg',
  },
  {
    icon: ShieldCheck,
    titleKey: 'intro.benefitSyncTitle',
    subKey: 'intro.benefitSyncSub',
    tint: 'bg-tint-green-bg text-tint-green-fg',
  },
]

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
  const [step, setStep] = useState<'intro' | 'form'>('intro')

  return step === 'intro' ? (
    <IntroStep
      t={t}
      onCreate={() => setStep('form')}
      onLogin={() => router.push('/login')}
    />
  ) : (
    <FormStep
      t={t}
      onBack={() => setStep('intro')}
      onLogin={() => router.push('/login')}
      onConverted={() => router.push('/')}
    />
  )
}

type T = ReturnType<typeof useTranslations<'start.convert'>>

/** step 'intro' — "Your plan is ready" celebration. */
function IntroStep({
  t,
  onCreate,
  onLogin,
}: {
  t: T
  onCreate: () => void
  onLogin: () => void
}) {
  const handleGuest = async () => {
    await continueAsGuest()
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-10">
      {/* Celebratory navy hero */}
      <section className="mt-5 rounded-[20px] bg-hero-gradient p-6 text-center text-hero-foreground shadow-floating">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-hero-foreground/10">
          <PartyPopper className="h-8 w-8 text-hero-success" aria-hidden="true" />
        </span>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-hero-foreground/10 px-2.5 py-1 text-tiny font-medium uppercase tracking-wide text-hero-foreground">
          {t('intro.badge')}
        </span>
        <h1 className="mt-3 text-3xl leading-title-2 font-bold">
          {t('intro.headline')}
        </h1>
        <p className="mt-3 text-md leading-body-lg text-hero-muted">
          {t('intro.subtext')}
        </p>
      </section>

      {/* Benefit list */}
      <section className="mt-8">
        <h2 className="text-sm leading-body-sm font-semibold text-muted-foreground">
          {t('intro.benefitsTitle')}
        </h2>
        <ul className="mt-4 flex flex-col gap-4">
          {BENEFITS.map(({ icon: Icon, titleKey, subKey, tint }) => (
            <li key={titleKey} className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${tint}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-md leading-body-lg font-semibold text-foreground">
                  {t(titleKey)}
                </span>
                <span className="block text-sm leading-body-sm text-muted-foreground">
                  {t(subKey)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3">
        <Button
          className="h-[52px] w-full rounded-[14px] text-md"
          onClick={onCreate}
        >
          {t('intro.createCta')}
        </Button>
        <Button
          variant="outline"
          className="h-[52px] w-full rounded-[14px] text-md"
          onClick={handleGuest}
        >
          {t('intro.guestCta')}
        </Button>
      </div>

      {/* Log-in footer */}
      <p className="mt-6 text-center text-sm leading-body-sm text-muted-foreground">
        {t('intro.loginPrompt')}{' '}
        <button
          type="button"
          onClick={onLogin}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('intro.loginLink')}
        </button>
      </p>
    </div>
  )
}

/** step 'form' — "Create your account". */
function FormStep({
  t,
  onBack,
  onLogin,
  onConverted,
}: {
  t: T
  onBack: () => void
  onLogin: () => void
  onConverted: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 6
  const canSubmit = emailValid && passwordValid && agreed && !submitting

  // NOTE: Google/Apple providers must be enabled in Supabase Auth for these to
  // work — they're wired regardless. linkIdentity redirects the browser away.
  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      await convertWithOAuth(provider)
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
      await convertWithEmail(email, password)
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
          variant="outline"
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
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
