
'use client'

import { useState } from 'react'
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

const CURRENCIES = [
  { value: 'IDR', label: '🇮🇩 IDR — Indonesian Rupiah' },
  { value: 'USD', label: '🇺🇸 USD — US Dollar' },
  { value: 'EUR', label: '🇪🇺 EUR — Euro' },
  { value: 'SGD', label: '🇸🇬 SGD — Singapore Dollar' },
] as const

const COUNTRIES = [
  { value: 'Indonesia', label: '🇮🇩 Indonesia' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'Other', label: '🌏 Other' },
] as const

const USER_GOALS = [
  { value: 'networth_tracking', label: 'Track my net worth' },
  { value: 'expense_management', label: 'Manage expenses & budgets' },
  { value: 'family_budget', label: 'Manage family budget' },
  { value: 'saving_goals', label: 'Save for a goal' },
  { value: 'freelance_income', label: 'Track freelance / business income' },
  { value: 'debt_payoff', label: 'Pay off debt' },
] as const

const createRegisterSchema = (requireVerification: boolean) =>
  z
    .object({
      fullName: z.string().min(2, 'Full name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string(),
      currency: z.enum(['IDR', 'USD', 'EUR', 'SGD']),
      country: z.string().min(1, 'Please select your country'),
      goal: z.enum(['networth_tracking', 'expense_management', 'family_budget', 'saving_goals', 'freelance_income', 'debt_payoff']).optional(),
      verificationConsent: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords don't match",
          path: ['confirmPassword'],
        })
      }

      if (requireVerification && !data.verificationConsent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'You must acknowledge the email verification requirement',
          path: ['verificationConsent'],
        })
      }
    })

type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>

const inputClassName = 'bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent'
const selectTriggerClassName = 'bg-white/10 border-white/20 text-auth-sidebar-foreground rounded-full h-12 px-6 focus:ring-offset-0 focus:ring-1 focus:ring-auth-accent [&>span]:text-white/90 [&_svg]:text-white/60'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<any>(null)
  const supabase = createClient()
  const shouldRequireVerification = !isDevToolsEnabled()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterSchema(shouldRequireVerification)),
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

        // Persist user preferences immediately after sign-in in dev mode
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

        toast.success('Registration successful! You are now signed in.')
        router.push('/')
        router.refresh()
        return
      }

      // Production: preferences will be synced from user_metadata by OnboardingContext on first load
      Analytics.track('registration_completed', {
        currency: data.currency,
        country: data.country,
        goal: data.goal ?? null,
        timestamp: new Date().toISOString(),
      })

      toast.success('Registration successful! Please check your email to verify your account.')
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (error: any) {
      setAuthError(error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-serif text-auth-sidebar-foreground">Create an account</h1>
        <p className="text-auth-sidebar-foreground/60">
          Enter your details below to create your account
        </p>
      </div>

      <div className="grid gap-6">
        <AuthErrorMessage error={authError} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            {/* Full Name */}
            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-auth-sidebar-foreground/80">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className={inputClassName}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-[#ff6b6b]">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-auth-sidebar-foreground/80">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                type="email"
                className={inputClassName}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-[#ff6b6b]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-auth-sidebar-foreground/80">Password</Label>
              <PasswordInput
                id="password"
                className={inputClassName}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-[#ff6b6b]">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-auth-sidebar-foreground/80">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                className={inputClassName}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-[#ff6b6b]">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Currency + Country row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-auth-sidebar-foreground/80">Primary Currency</Label>
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Currency" />
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

              <div className="grid gap-2">
                <Label className="text-auth-sidebar-foreground/80">Country</Label>
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue placeholder="Country" />
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
                  <p className="text-sm text-[#ff6b6b]">{errors.country.message}</p>
                )}
              </div>
            </div>

            {/* Goal */}
            <div className="grid gap-2">
              <Label className="text-auth-sidebar-foreground/80">
                What&apos;s your main goal? <span className="opacity-50">(optional)</span>
              </Label>
              <Controller
                control={control}
                name="goal"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {USER_GOALS.map(g => {
                      const isSelected = field.value === g.value
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => field.onChange(isSelected ? undefined : g.value)}
                          className={[
                            'text-left text-sm px-3 py-2 rounded-xl border transition-colors',
                            isSelected
                              ? 'border-auth-accent bg-auth-accent/20 text-auth-sidebar-foreground'
                              : 'border-white/20 bg-white/5 text-auth-sidebar-foreground/70 hover:bg-white/10 hover:border-white/30',
                          ].join(' ')}
                        >
                          {g.label}
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
                    <p className="leading-relaxed">
                      We&apos;ll send a verification link to your email address. You&apos;ll need to click it before you can sign in.
                    </p>
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
                      I understand that I will need to verify my email address to access my account.
                    </label>
                    {errors.verificationConsent && (
                      <p className="text-sm text-[#ff6b6b]">{errors.verificationConsent.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Button className="w-full h-12 rounded-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90 font-medium text-base mt-2" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign Up
            </Button>
          </div>
        </form>
      </div>

      <div className="text-center text-sm text-auth-sidebar-foreground/60">
        Already have an account?{" "}
        <Link href="/login" className="text-auth-accent hover:text-auth-accent/90 underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  )
}
