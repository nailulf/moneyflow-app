'use client'

import { useState } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  ArrowRight,
  Loader2
} from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Bank Account', icon: Banknote, description: 'Checking or savings account' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, description: 'Credit card account' },
  { value: 'CASH', label: 'Cash', icon: Wallet, description: 'Cash on hand' },
  { value: 'INVESTMENT', label: 'Investment', icon: PiggyBank, description: 'Stocks, bonds, mutual funds' },
  { value: 'OTHER', label: 'E-Wallet / Other', icon: Smartphone, description: 'GoPay, OVO, Dana, etc.' }
]

export function AccountSetupStepModal() {
  const { user } = useAuth()
  const { nextPhase, setWizardData } = useOnboarding()
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
        is_default: true,
        description: null
      }

      await createAccount(accountData)
      setWizardData({ account: accountData })
      await nextPhase()
    } catch (err) {
      console.error('Error creating account:', err)
      setError('Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipStep = async () => {
    await nextPhase()
  }

  const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType)

  return (
    <div className="space-y-4">
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
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="outline"
          onClick={handleSkipStep}
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
  )
}
