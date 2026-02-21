
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

const createRegisterSchema = (requireVerification: boolean) =>
  z
    .object({
      fullName: z.string().min(2, 'Full name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string(),
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
      verificationConsent: !shouldRequireVerification,
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'user',
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

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

        if (signInError) {
          throw signInError
        }

        toast.success('Registration successful! You are now signed in.')
        router.push('/')
        router.refresh()
        return
      }

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
            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-auth-sidebar-foreground/80">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-[#ff6b6b]">{errors.fullName.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-auth-sidebar-foreground/80">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                type="email"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-[#ff6b6b]">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-auth-sidebar-foreground/80">Password</Label>
              <PasswordInput
                id="password"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-[#ff6b6b]">{errors.password.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-auth-sidebar-foreground/80">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-[#ff6b6b]">{errors.confirmPassword.message}</p>
              )}
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
