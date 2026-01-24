
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { AuthErrorMessage } from '@/components/auth/auth-error-message'
import { PasswordInput } from '@/components/ui/password-input'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
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

  const handleTestUserLogin = async () => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test@moneyflow.com',
        password: 'test123456',
      })

      if (error) {
        throw error
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
            <Button
              variant="outline"
              className="w-full h-12 rounded-full bg-transparent border-white/20 text-auth-sidebar-foreground hover:bg-white/10 hover:text-white"
              onClick={handleTestUserLogin}
              disabled={isLoading}
            >
               {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
              Test User Bypass
            </Button>
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
