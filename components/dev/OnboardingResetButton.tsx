'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { isOnboardingResetEnabled } from '@/lib/utils/environment'

interface OnboardingResetButtonProps {
  userId: string
  className?: string
}

export function OnboardingResetButton({ userId, className }: OnboardingResetButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  const handleCheckboxChange = async (checked: boolean) => {
    setIsChecked(checked)
    
    if (checked) {
      if (!confirm('Are you sure you want to reset the onboarding state? This will clear all onboarding progress and test data.')) {
        setIsChecked(false)
        return
      }

      setIsLoading(true)
      
      try {
        const response = await fetch('/api/dev/reset-onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to reset onboarding')
        }

        const result = await response.json()
        
        toast.success('Onboarding state reset successfully!')
        console.log('Onboarding reset result:', result)
        
        // Refresh the page to see the changes
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
      } catch (error: any) {
        console.error('Error resetting onboarding:', error)
        toast.error(error.message || 'Failed to reset onboarding')
        setIsChecked(false)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Only show in development/preview environments
  if (!isOnboardingResetEnabled()) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Checkbox
        id="reset-onboarding"
        checked={isChecked}
        onCheckedChange={handleCheckboxChange}
        disabled={isLoading}
        className="data-[state=checked]:bg-auth-accent data-[state=checked]:border-auth-accent"
      />
      <Label htmlFor="reset-onboarding" className="text-sm text-auth-sidebar-foreground/80 cursor-pointer">
        {isLoading ? (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Resetting...
          </span>
        ) : (
          'Reset Onboarding State'
        )}
      </Label>
    </div>
  )
}