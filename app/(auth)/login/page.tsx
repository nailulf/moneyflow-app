
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthErrorMessage } from '@/components/auth/auth-error-message'
import { PasswordInput } from '@/components/ui/password-input'
import { OnboardingResetButton } from '@/components/dev/OnboardingResetButton'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
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

  const [shouldResetOnboarding, setShouldResetOnboarding] = useState(false)

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

      // Store the user ID for onboarding reset functionality
      if (user) {
        setCurrentUserId(user.id)
        
        // Reset onboarding if checkbox is checked
        if (shouldResetOnboarding) {
          try {
            const response = await fetch('/api/dev/reset-onboarding', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId: user.id }),
            })

            if (!response.ok) {
              const error = await response.json()
              console.warn('Onboarding reset failed:', error)
              // Continue with login even if reset fails
            } else {
              const result = await response.json()
              console.log('Onboarding reset successful:', result)
              toast.success('Onboarding reset successfully!')
            }
          } catch (resetError: any) {
            console.error('Error resetting onboarding:', resetError)
            // Continue with login even if reset fails
          }
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
              <div className="flex items-center mb-8 space-x-2 pt-3 mt-3 border-t border-white/10">
                <Checkbox
                  id="reset-onboarding"
                  checked={shouldResetOnboarding}
                  onCheckedChange={(checked) => setShouldResetOnboarding(checked === true)}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-auth-accent data-[state=checked]:border-auth-accent"
                />
                <Label htmlFor="reset-onboarding" className="text-sm text-auth-sidebar-foreground/80 cursor-pointer">
                  Show onboarding flow
                </Label>
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
