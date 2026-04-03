
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'
import { PasswordInput } from '@/components/ui/molecules/password-input'
import { AuthErrorMessage } from '@/components/auth/auth-error-message'
import { SocialLoginButtons } from '@/components/auth/social-login-buttons'
import { isDevToolsEnabled } from '@/lib/utils/environment'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/molecules/select'
import { preferences } from '@/lib/api/user-preferences'
import { Analytics } from '@/lib/analytics/amplitude'
import { useTranslations } from 'next-intl'

const CURRENCIES = [
  { value: 'IDR', label: '🇮🇩 IDR — Indonesian Rupiah' },
  { value: 'USD', label: '🇺🇸 USD — US Dollar' },
  { value: 'EUR', label: '🇪🇺 EUR — Euro' },
  { value: 'GBP', label: '🇬🇧 GBP — British Pound' },
  { value: 'SGD', label: '🇸🇬 SGD — Singapore Dollar' },
  { value: 'MYR', label: '🇲🇾 MYR — Malaysian Ringgit' },
  { value: 'JPY', label: '🇯🇵 JPY — Japanese Yen' },
  { value: 'AED', label: '🇦🇪 AED — UAE Dirham' },
  { value: 'SAR', label: '🇸🇦 SAR — Saudi Riyal' },
] as const

const COUNTRIES = [
  { value: 'Indonesia', label: '🇮🇩 Indonesia' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'Other', label: '🌏 Other' },
] as const

const GOAL_VALUES = [
  'networth_tracking',
  'expense_management',
  'family_budget',
  'saving_goals',
  'debt_payoff',
] as const

const inputClassName = 'bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent'
const selectTriggerClassName = 'bg-white/10 border-white/20 text-auth-sidebar-foreground rounded-full h-12 px-6 focus:ring-offset-0 focus:ring-1 focus:ring-auth-accent [&>span]:text-white/90 [&_svg]:text-white/60 w-full'

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('auth.register')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<Error | null>(null)
  // Stable reference — createClient() must not run on every render
  const supabase = useMemo(() => createClient(), [])
  const shouldRequireVerification = !isDevToolsEnabled()

  const registerSchema = z
    .object({
      fullName: z.string().trim().min(2, { message: t('errors.fullNameTooShort') }),
      email: z.string().email({ message: t('errors.invalidEmail') }),
      password: z.string()
        .min(8, { message: t('errors.passwordTooShort') })
        .regex(/[0-9]/, { message: t('errors.passwordNeedsNumber') }),
      confirmPassword: z.string(),
      currency: z.enum(['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'JPY', 'AED', 'SAR']),
      country: z.string().min(1, { message: t('errors.selectCountry') }),
      goal: z.enum(['networth_tracking', 'expense_management', 'family_budget', 'saving_goals', 'freelance_income', 'debt_payoff']).optional(),
      verificationConsent: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('errors.passwordsDontMatch'),
          path: ['confirmPassword'],
        })
      }

      if (shouldRequireVerification && !data.verificationConsent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('errors.mustAcknowledgeVerification'),
          path: ['verificationConsent'],
        })
      }
    })

  type RegisterFormValues = z.infer<typeof registerSchema>

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      currency: 'IDR',
      country: 'Indonesia',
      goal: undefined,
      verificationConsent: !shouldRequireVerification,
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // Point the verification link to our PKCE callback handler so the
          // code can be exchanged for a session and preferences written.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            role: 'user',
            preferred_currency: data.currency,
            country: data.country,
            user_goal: data.goal ?? null,
          },
        },
      })

      if (error) {
        throw error
      }

      if (!shouldRequireVerification) {
        const confirmResponse = await fetch('/api/dev/confirm-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: data.email }),
        })

        if (!confirmResponse.ok) {
          throw new Error('Failed to confirm email')
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

        if (signInError) {
          throw signInError
        }

        if (signInData.user) {
          await Promise.all([
            preferences.setCurrency(signInData.user.id, data.currency),
            preferences.setCountry(signInData.user.id, data.country),
            data.goal
              ? preferences.setUserGoal(signInData.user.id, data.goal)
              : Promise.resolve(),
          ])
        }

        Analytics.track('registration_completed', {
          currency: data.currency,
          country: data.country,
          goal: data.goal ?? null,
          timestamp: new Date().toISOString(),
        })

        toast.success(t('successDev'))
        router.push('/')
        router.refresh()
        return
      }

      // Email is sent but not yet verified — the user hasn't completed registration.
      // Fire registration_completed only after the callback confirms the session
      // (dev path below). Here we track the submit event only.
      Analytics.track('registration_email_sent', {
        currency: data.currency,
        country: data.country,
        goal: data.goal ?? null,
        timestamp: new Date().toISOString(),
      })

      toast.success(t('successProd'))
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error : new Error('An unexpected error occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-serif text-auth-sidebar-foreground">{t('title')}</h1>
        <p className="text-auth-sidebar-foreground/60">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6">
        <AuthErrorMessage error={authError} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            {/* Full Name */}
            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-auth-sidebar-foreground/80">{t('fullName')}</Label>
              <Input
                id="fullName"
                placeholder={t('fullNamePlaceholder')}
                className={inputClassName}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-auth-sidebar-foreground/80">{t('email')}</Label>
              <Input
                id="email"
                placeholder={t('emailPlaceholder')}
                type="email"
                className={inputClassName}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-auth-sidebar-foreground/80">{t('password')}</Label>
              <PasswordInput
                id="password"
                className={inputClassName}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-auth-sidebar-foreground/80">{t('confirmPassword')}</Label>
              <PasswordInput
                id="confirmPassword"
                className={inputClassName}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Currency + Country row */}
            <div className="grid gap-2 w-full">
              <Label className="text-auth-sidebar-foreground/80">{t('primaryCurrency')}</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder={t('currencyPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2 w-full">
              <Label className="text-auth-sidebar-foreground/80">{t('country')}</Label>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder={t('countryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>

            {/* Goal */}
            <div className="grid gap-2">
              <Label className="text-auth-sidebar-foreground/80">
                {t('goal')} <span className="opacity-50">{t('goalOptional')}</span>
              </Label>
              <Controller
                control={control}
                name="goal"
                render={({ field }) => (
                  <div className="grid gap-2 w-full">
                    {GOAL_VALUES.map(value => {
                      const isSelected = field.value === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(isSelected ? undefined : value)}
                          className={[
                            'text-left text-sm px-3 py-2 rounded-xl border transition-colors',
                            isSelected
                              ? 'border-auth-accent bg-auth-accent/20 text-auth-sidebar-foreground'
                              : 'border-white/20 bg-white/5 text-auth-sidebar-foreground/70 hover:bg-white/10 hover:border-white/30',
                          ].join(' ')}
                        >
                          {t(`goals.${value}`)}
                        </button>
                      )
                    })}
                  </div>
                )}
              />
            </div>

            {shouldRequireVerification && (
              <>
                <div className="rounded-xl bg-white/10 border border-white/10 p-4">
                  <div className="flex gap-3 text-sm text-auth-sidebar-foreground/90">
                    <Info className="h-5 w-5 shrink-0 text-auth-accent" />
                    <p className="leading-relaxed">{t('verificationNotice')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Controller
                    control={control}
                    name="verificationConsent"
                    render={({ field }) => (
                      <Checkbox
                        id="verificationConsent"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/40 data-[state=checked]:bg-auth-accent data-[state=checked]:text-auth-accent-foreground data-[state=checked]:border-auth-accent mt-0.5"
                      />
                    )}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="verificationConsent"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-auth-sidebar-foreground/80"
                    >
                      {t('verificationConsent')}
                    </label>
                    {errors.verificationConsent && (
                      <p className="text-sm text-destructive">{errors.verificationConsent.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Button className="w-full h-12 rounded-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90 font-medium text-base mt-2" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('submit')}
            </Button>
          </div>
        </form>

        <SocialLoginButtons />
      </div>

      <div className="text-center text-sm text-auth-sidebar-foreground/60">
        {t('alreadyHaveAccount')}{" "}
        <Link href="/login" className="text-auth-accent hover:text-auth-accent/90 underline underline-offset-4">
          {t('signIn')}
        </Link>
      </div>
    </div>
  )
}
