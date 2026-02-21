
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthErrorMessage } from '@/components/auth/auth-error-message'
import { PasswordInput } from '@/components/ui/molecules/password-input'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingTestUser, setIsResettingTestUser] = useState(false)
  const [authError, setAuthError] = useState<any>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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

      toast.success('Logged in successfully')
      router.push('/')
      router.refresh()
    } catch (error: any) {
      setAuthError(error)
      if (error.message?.includes('Email not confirmed')) {
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
        }, 2000)
      }
      setIsLoading(false)
    }
  }

  const [shouldPreviewOnboarding, setShouldPreviewOnboarding] = useState(false)
  const [shouldBypassAccountCheck, setShouldBypassAccountCheck] = useState(false)
  const bypassKey = 'dev_onboarding_bypass_account_check'

  useEffect(() => {
    if (typeof window === 'undefined') return
    setShouldBypassAccountCheck(localStorage.getItem(bypassKey) === 'true')
  }, [bypassKey])

  const handleTestUserLogin = async () => {
    setIsLoading(true)
    setAuthError(null)
    
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: 'test@moneyflow.com',
        password: 'test123456',
      })

      if (error) {
        throw error
      }

      if (user) {
        const previewKey = `dev_onboarding_preview_${user.id}`
        const stateKey = `dev_onboarding_state_${user.id}`

        if (shouldPreviewOnboarding) {
          const timestamp = new Date().toISOString()
          localStorage.setItem(previewKey, 'true')
          localStorage.setItem(stateKey, JSON.stringify({
            id: `local-${user.id}`,
            user_id: user.id,
            current_phase: 'welcome',
            current_step: 0,
            is_completed: false,
            is_skipped: false,
            completed_at: null,
            skipped_at: null,
            created_at: timestamp,
            updated_at: timestamp
          }))
          toast.success('Onboarding preview enabled')
        } else {
          localStorage.removeItem(previewKey)
          localStorage.removeItem(stateKey)
        }
      }

      toast.success('Logged in as Test User')
      router.push('/')
      router.refresh()
    } catch (error: any) {
      setAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetTestUserData = async () => {
    setIsResettingTestUser(true)
    try {
      const response = await fetch('/api/dev/reset-test-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@moneyflow.com' })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to reset test user data')
      }

      const data = await response.json()
      const userId = data?.userId as string | undefined

      if (typeof window !== 'undefined') {
        if (userId) {
          const previewKey = `dev_onboarding_preview_${userId}`
          const stateKey = `dev_onboarding_state_${userId}`
          localStorage.removeItem(previewKey)
          localStorage.removeItem(stateKey)
        }
        localStorage.removeItem(bypassKey)
      }

      setShouldPreviewOnboarding(false)
      setShouldBypassAccountCheck(false)
      toast.success('Test user data reset')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset test user data')
    } finally {
      setIsResettingTestUser(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-serif text-white">Welcome back</h1>
        <p className="text-white/60">
          Enter your email below to login to your account
        </p>
      </div>
      
      <div className="grid gap-6">
        <AuthErrorMessage error={authError} />
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-auth-sidebar-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-[#ff6b6b]">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-auth-sidebar-foreground/80">Password</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto text-sm text-auth-accent hover:text-auth-accent/90 underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                className="bg-white/10 border-white/20 text-auth-sidebar-foreground placeholder:text-white/40 rounded-full h-12 px-6 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-auth-accent"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-[#ff6b6b]">{errors.password.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full h-12 rounded-full bg-auth-accent text-auth-accent-foreground hover:bg-auth-accent/90 font-medium text-base mt-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Login
            </Button>
          </div>
        </form>

        {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') && (
          <>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-white/20">
              <span className="relative z-10 bg-auth-sidebar px-2 text-auth-sidebar-foreground/60">
                Or continue with
              </span>
            </div>
            
            {/* Developer Tools Section */}
            <div className="mt-4 p-4 border border-white/20 rounded-lg bg-white/5">
              <p className="text-sm font-medium text-auth-sidebar-foreground/80 mb-3">
                🛠️ Developer Tools
              </p>
              {/* Onboarding Reset Option */}
              <div className="mb-4 pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reset-onboarding"
                    checked={shouldPreviewOnboarding}
                    onCheckedChange={(checked) => setShouldPreviewOnboarding(checked === true)}
                    disabled={isLoading}
                    className="data-[state=checked]:bg-auth-accent data-[state=checked]:border-auth-accent"
                  />
                  <Label htmlFor="reset-onboarding" className="text-sm text-auth-sidebar-foreground/80 cursor-pointer">
                    Preview onboarding journey (reset to welcome)
                  </Label>
                </div>
                <p className="text-xs text-auth-sidebar-foreground/60 mt-1">
                  Uses local preview state and resets the flow to the welcome step
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bypass-onboarding-account-check"
                    checked={shouldBypassAccountCheck}
                    onCheckedChange={(checked) => {
                      const nextValue = checked === true
                      setShouldBypassAccountCheck(nextValue)
                      if (typeof window === 'undefined') return
                      if (nextValue) {
                        localStorage.setItem(bypassKey, 'true')
                      } else {
                        localStorage.removeItem(bypassKey)
                      }
                    }}
                    disabled={isLoading}
                    className="data-[state=checked]:bg-auth-accent data-[state=checked]:border-auth-accent"
                  />
                  <Label htmlFor="bypass-onboarding-account-check" className="text-sm text-auth-sidebar-foreground/80 cursor-pointer">
                    Keep onboarding open (no reset)
                  </Label>
                </div>
                <p className="text-xs text-auth-sidebar-foreground/60 mt-1">
                  Keeps the modal open even if onboarding is already completed
                </p>
              </div>
              
              {/* Test User Login */}
              <Button
                variant="outline"
                className="w-full h-12 rounded-full bg-transparent border-white/20 text-auth-sidebar-foreground hover:bg-white/10 hover:text-white mb-3"
                onClick={handleTestUserLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Test User
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-full bg-transparent border-white/20 text-auth-sidebar-foreground hover:bg-white/10 hover:text-white"
                onClick={handleResetTestUserData}
                disabled={isResettingTestUser}
              >
                {isResettingTestUser ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset Test User Data
              </Button>
            </div>
          </>
        )}
      </div>
      
      <div className="text-center text-sm text-auth-sidebar-foreground/60">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-auth-accent hover:text-auth-accent/90 underline underline-offset-4">
          Sign up
        </Link>
      </div>
    </div>
  )
}
