'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/atoms/label'
import { Checkbox } from '@/components/ui/atoms/checkbox'
import { toast } from 'sonner'
import { isOnboardingResetEnabled } from '@/lib/utils/environment'

interface OnboardingResetButtonProps {
  userId: string
  className?: string
}

export function OnboardingResetButton({ userId, className }: OnboardingResetButtonProps) {
  const [isChecked, setIsChecked] = useState(false)
  const previewKey = `dev_onboarding_preview_${userId}`
  const stateKey = `dev_onboarding_state_${userId}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsChecked(localStorage.getItem(previewKey) === 'true')
  }, [previewKey])

  const handleCheckboxChange = async (checked: boolean) => {
    setIsChecked(checked)

    if (typeof window === 'undefined') return

    if (checked) {
      const timestamp = new Date().toISOString()
      localStorage.setItem(previewKey, 'true')
      localStorage.setItem(stateKey, JSON.stringify({
        id: `local-${userId}`,
        user_id: userId,
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
      toast.success('Onboarding preview disabled')
    }

    setTimeout(() => {
      window.location.reload()
    }, 300)
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
        className="data-[state=checked]:bg-auth-accent data-[state=checked]:border-auth-accent"
      />
      <Label htmlFor="reset-onboarding" className="text-sm text-auth-sidebar-foreground/80 cursor-pointer">
        {isChecked ? 'Onboarding preview enabled' : 'Preview onboarding journey'}
      </Label>
    </div>
  )
}
