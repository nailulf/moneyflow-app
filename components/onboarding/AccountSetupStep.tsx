'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { EducationalCard } from './EducationalCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Banknote,
  CreditCard,
  Wallet,
  PiggyBank,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Analytics } from '@/lib/analytics/amplitude'

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Bank Account', icon: Banknote, description: 'Checking or savings account' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, description: 'Credit card account' },
  { value: 'CASH', label: 'Cash', icon: Wallet, description: 'Cash on hand' },
  { value: 'INVESTMENT', label: 'Investment', icon: PiggyBank, description: 'Stocks, bonds, mutual funds' },
  { value: 'OTHER', label: 'E-Wallet / Other', icon: Smartphone, description: 'GoPay, OVO, Dana, etc.' }
]

export function AccountSetupStep() {
  const router = useRouter()
  const { user } = useAuth()
  const { nextPhase, skip, setWizardData } = useOnboarding()
  const { createAccount } = useAccounts()

  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<string>('BANK')
  const [balance, setBalance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name')
      return
    }

    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    Analytics.track('Onboarding Create Account Clicked', {
      account_type: accountType,
      has_balance: !!balance && parseFloat(balance) > 0,
      step: 'account_setup'
    })

    setIsSubmitting(true)
    setError(null)

    try {
      const accountData = {
        user_id: user.id,
        name: accountName.trim(),
        type: accountType as 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER',
        balance: parseFloat(balance) || 0,
        currency: 'IDR',
        is_active: true,
        is_default: true, // First account is default
        description: null
      }

      await createAccount(accountData)

      Analytics.track('Onboarding Account Created', {
        account_type: accountType,
        has_balance: !!balance && parseFloat(balance) > 0,
        step: 'account_setup'
      })

      // Store in wizard data
      setWizardData({ account: accountData })

      // Move to next step
      await nextPhase()
    } catch (err) {
      console.error('Error creating account:', err)
      Analytics.track('Onboarding Account Creation Failed', {
        account_type: accountType,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        step: 'account_setup'
      })
      setError('Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipAccount = async () => {
    Analytics.track('Onboarding Skip Step Clicked', {
      step: 'account_setup',
      action: 'skip_this_step'
    })
    // Move to next step without creating account
    await nextPhase()
  }

  const handleSkipOnboarding = async () => {
    Analytics.track('Onboarding Skip Entirely Clicked', {
      step: 'account_setup',
      action: 'skip_setup_entirely'
    })
    await skip('Skipped from account setup')
    router.push('/')
  }

  const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType)

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create Your First Account</h2>
        <p className="mt-2 text-gray-600">
          Add your primary financial account to start tracking
        </p>
      </div>

      {/* Educational Card */}
      <EducationalCard
        title="What are accounts?"
        description="Accounts represent your real-world financial assets like bank accounts, credit cards, e-wallets (GoPay, OVO, Dana), cash, and investments. Think of them as separate money containers you track individually."
      />

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              placeholder="e.g., My BCA Checking, Main Cash"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Give your account a recognizable name
            </p>
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type *</Label>
            <Select
              value={accountType}
              onValueChange={setAccountType}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">
                {selectedType.description}
              </p>
            )}
          </div>

          {/* Starting Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance">Starting Balance (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                Rp
              </span>
              <Input
                id="balance"
                type="number"
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your current balance (you can update this anytime)
            </p>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleSkipOnboarding}
          disabled={isSubmitting}
        >
          Skip setup entirely
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSkipAccount}
            disabled={isSubmitting}
          >
            Skip this step
          </Button>
          <Button
            onClick={handleCreateAccount}
            disabled={isSubmitting || !accountName.trim()}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
