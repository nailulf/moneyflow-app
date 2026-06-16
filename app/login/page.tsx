'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronDown, Fingerprint, Loader2, Wallet } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils/site-url'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import { PasswordInput } from '@/components/ui/molecules/password-input'
import { AuthErrorMessage } from '@/components/auth/auth-error-message'
import { LocaleToggle } from '@/components/features/onboarding/LocaleToggle'

type OAuthProvider = 'google' | 'apple'

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
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

/**
 * Returning-user sign-in (design Row C — "Welcome back"), funnel-styled.
 *
 * This is the LOGIN of an EXISTING account via standard Supabase
 * email/password or OAuth (`signInWithPassword` / `signInWithOAuth`) — NOT the
 * guest anonymous-conversion path (`linkIdentity`/`convertWithOAuth`) used by
 * `/start/save`. The funnel's "Already have an account?" links here; this
 * screen's footer links back to `/start` for new users.
 *
 * TODO: biometric / Face ID sign-in (WebAuthn passkeys) is deferred — out of
 * scope for the web PWA; revisit when native/TWA passkey support lands.
 */
export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('auth.login')
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null)
  const [authError, setAuthError] = useState<unknown>(null)

  const loginSchema = z.object({
    email: z.string().email({ message: t('errors.invalidEmail') }),
    password: z.string().min(6, { message: t('errors.passwordTooShort') }),
  })

  type LoginFormValues = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        throw error
      }

      toast.success(t('successLoggedIn'))
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      setAuthError(error)
      const message = error instanceof Error ? error.message : ''
      if (message.includes('Email not confirmed')) {
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
        }, 2000)
      }
      setIsLoading(false)
    }
  }

  // OAuth sign-in of an existing account (standard signInWithOAuth — NOT the
  // funnel's anonymous-conversion linkIdentity). Browser navigates away on success.
  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthProvider(provider)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback`,
      },
    })
    if (error) {
      toast.error(t('oauthError'))
      setOauthProvider(null)
    }
  }

  const busy = isLoading || oauthProvider !== null

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-5 pt-8">
      {/* Locale switch — absolutely positioned so it adds no layout height
          (keeps the tightly-packed login fitting 375×812 with no scroll). */}
      <LocaleToggle className="absolute right-5 top-5 z-10" />

      {/* Brand — navy tile + wordmark, then the welcome heading */}
      <header className="flex flex-col items-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-hero-gradient shadow-card">
          <Wallet className="h-7 w-7 text-hero-foreground" aria-hidden="true" />
        </span>
        <p className="mt-3 text-lg leading-title-5 font-bold text-foreground">
          {t('brand')}
        </p>
        <h1 className="mt-3 text-2xl leading-title-3 font-bold text-foreground">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm leading-body-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </header>

      <AuthErrorMessage error={authError} className="mt-4" />

      {/* OAuth buttons */}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-[52px] w-full gap-2 rounded-[14px] text-md"
          onClick={() => handleOAuth('google')}
          disabled={busy}
        >
          {oauthProvider === 'google' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleIcon />
          )}
          {t('google')}
        </Button>
        <Button
          type="button"
          className="h-[52px] w-full gap-2 rounded-[14px] bg-foreground text-md text-background hover:bg-foreground/90"
          onClick={() => handleOAuth('apple')}
          disabled={busy}
        >
          {oauthProvider === 'apple' ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <AppleIcon />
          )}
          {t('apple')}
        </Button>
      </div>

      {/* Divider */}
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="text-xs leading-caption text-muted-foreground">
          {t('divider')}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      {/* Email + password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-email">{t('email')}</Label>
          <Input
            id="login-email"
            data-testid="login-email"
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

        <div className="grid gap-2">
          <Label htmlFor="login-password">{t('password')}</Label>
          <PasswordInput
            id="login-password"
            data-testid="login-password"
            autoComplete="current-password"
            className="h-[52px] rounded-[14px]"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm leading-body-sm text-destructive">
              {errors.password.message}
            </p>
          )}
          <Link
            href="/forgot-password"
            className="justify-self-end text-sm leading-body-sm font-medium text-primary hover:text-primary/80"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <Button
          type="submit"
          data-testid="login-submit"
          className="mt-2 h-[52px] w-full rounded-[14px] text-md"
          disabled={busy || !isValid}
        >
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          {isLoading ? t('submitting') : t('submit')}
        </Button>
      </form>

      {/* Biometric affordance — matches the design; real WebAuthn is deferred. */}
      <button
        type="button"
        onClick={() => toast(t('biometricSoon'))}
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center gap-2 self-center text-sm leading-body-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
      >
        {/* TODO: WebAuthn passkey sign-in */}
        <Fingerprint className="h-4 w-4" aria-hidden="true" />
        {t('faceId')}
      </button>

      {/* New-user footer → funnel front door */}
      <p className="mt-4 text-center text-sm leading-body-sm text-muted-foreground">
        {t('newHere')}{' '}
        <button
          type="button"
          onClick={() => router.push('/start')}
          className="font-medium text-primary hover:text-primary/80"
        >
          {t('createAccount')}
        </button>
      </p>

      {/* Dev-only quick tools — never rendered in production. */}
      {process.env.NODE_ENV === 'development' && (
        <DevTools
          supabase={supabase}
          busy={busy}
          setIsLoading={setIsLoading}
          setAuthError={setAuthError}
          onLoggedIn={() => {
            router.push('/')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

/**
 * Dev-only quick-login & onboarding-preview tools, ported from the legacy
 * login page. Collapsed and visually de-emphasized; guarded by NODE_ENV so it
 * is tree-shaken out of production builds.
 */
function DevTools({
  supabase,
  busy,
  setIsLoading,
  setAuthError,
  onLoggedIn,
}: {
  supabase: ReturnType<typeof createClient>
  busy: boolean
  setIsLoading: (v: boolean) => void
  setAuthError: (v: unknown) => void
  onLoggedIn: () => void
}) {
  const [open, setOpen] = useState(false)
  const [shouldPreviewOnboarding, setShouldPreviewOnboarding] = useState(false)
  const [shouldBypassAccountCheck, setShouldBypassAccountCheck] = useState(false)
  const [isResettingTestUser, setIsResettingTestUser] = useState(false)
  const bypassKey = 'dev_onboarding_bypass_account_check'

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShouldBypassAccountCheck(localStorage.getItem(bypassKey) === 'true')
  }, [])

  const handleTestUserLogin = async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.signInWithPassword({
        email: 'test@moneyflow.com',
        password: 'test123456',
      })
      if (error) throw error

      if (user) {
        const previewKey = `dev_onboarding_preview_${user.id}`
        const stateKey = `dev_onboarding_state_${user.id}`
        if (shouldPreviewOnboarding) {
          const timestamp = new Date().toISOString()
          localStorage.setItem(previewKey, 'true')
          localStorage.setItem(
            stateKey,
            JSON.stringify({
              id: `local-${user.id}`,
              user_id: user.id,
              current_phase: 'welcome',
              current_step: 0,
              is_completed: false,
              is_skipped: false,
              completed_at: null,
              skipped_at: null,
              created_at: timestamp,
              updated_at: timestamp,
            }),
          )
          toast.success('Onboarding preview enabled')
        } else {
          localStorage.removeItem(previewKey)
          localStorage.removeItem(stateKey)
        }
      }

      toast.success('Logged in as Test User')
      onLoggedIn()
    } catch (error: unknown) {
      setAuthError(error)
      setIsLoading(false)
    }
  }

  const handleResetTestUserData = async () => {
    setIsResettingTestUser(true)
    try {
      const response = await fetch('/api/dev/reset-test-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@moneyflow.com' }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to reset test user data')
      }
      const data = await response.json()
      const userId = data?.userId as string | undefined

      if (typeof window !== 'undefined') {
        if (userId) {
          localStorage.removeItem(`dev_onboarding_preview_${userId}`)
          localStorage.removeItem(`dev_onboarding_state_${userId}`)
        }
        localStorage.removeItem(bypassKey)
      }
      setShouldPreviewOnboarding(false)
      setShouldBypassAccountCheck(false)
      toast.success('Test user data reset')
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reset test user data',
      )
    } finally {
      setIsResettingTestUser(false)
    }
  }

  return (
    <div className="mt-auto border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs leading-caption font-medium text-muted-foreground hover:text-foreground"
      >
        Developer tools
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 rounded-[14px] border border-border bg-muted/40 p-4">
          <label className="flex items-start gap-2.5 text-sm leading-body-sm text-foreground">
            <Checkbox
              checked={shouldPreviewOnboarding}
              onCheckedChange={(checked) =>
                setShouldPreviewOnboarding(checked === true)
              }
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              Preview onboarding journey (reset to welcome)
              <span className="block text-xs leading-caption text-muted-foreground">
                Uses local preview state and resets the flow to the welcome step
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm leading-body-sm text-foreground">
            <Checkbox
              checked={shouldBypassAccountCheck}
              onCheckedChange={(checked) => {
                const next = checked === true
                setShouldBypassAccountCheck(next)
                if (typeof window === 'undefined') return
                if (next) localStorage.setItem(bypassKey, 'true')
                else localStorage.removeItem(bypassKey)
              }}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              Keep onboarding open (no reset)
              <span className="block text-xs leading-caption text-muted-foreground">
                Keeps the modal open even if onboarding is already completed
              </span>
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-[14px]"
            onClick={handleTestUserLogin}
            disabled={busy}
          >
            Test User
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-[14px]"
            onClick={handleResetTestUserData}
            disabled={isResettingTestUser}
          >
            {isResettingTestUser && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Reset Test User Data
          </Button>
        </div>
      )}
    </div>
  )
}
