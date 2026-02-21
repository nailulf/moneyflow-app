'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { CurrencyInput } from '@/components/ui/atoms/currency-input'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/molecules/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/molecules/popover'
import { ScrollArea } from '@/components/ui/atoms/scroll-area'
import {
  Banknote,
  CreditCard,
  Wallet,
  PiggyBank,
  Smartphone,
  ArrowRight,
  Loader2,
  Check,
  ChevronsUpDown,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INDONESIAN_BANKS, type BankOption } from '@/lib/constants/banks'

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Bank Account', icon: Banknote, description: 'Checking or savings account' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, description: 'Credit card account' },
  { value: 'CASH', label: 'Cash', icon: Wallet, description: 'Cash on hand' },
  { value: 'INVESTMENT', label: 'Investment', icon: PiggyBank, description: 'Stocks, bonds, mutual funds' },
  { value: 'OTHER', label: 'E-Wallet / Other', icon: Smartphone, description: 'GoPay, OVO, Dana, etc.' }
]

const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' }
]

export function AccountSetupStepModal() {
  const { user } = useAuth()
  const { nextPhase, setWizardData, isPreviewMode } = useOnboarding()
  const { createAccount } = useAccounts()

  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<string>('BANK')
  const [currency, setCurrency] = useState('IDR')
  const [balance, setBalance] = useState<number>(0)
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null)
  const [bankSearch, setBankSearch] = useState('')
  const [isBankPopoverOpen, setIsBankPopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Analytics.track('onboarding_account_setup_viewed', {
      phase: 'account_setup',
      timestamp: new Date().toISOString()
    })
  }, [])

  useEffect(() => {
    if (accountType === 'BANK' || accountType === 'OTHER') {
      return
    }

    setSelectedBank(null)
    setBankSearch('')
    setIsBankPopoverOpen(false)
  }, [accountType])

  const filteredBanks: BankOption[] = bankSearch.trim()
    ? INDONESIAN_BANKS.filter(b =>
        b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.shortName.toLowerCase().includes(bankSearch.toLowerCase())
      )
    : INDONESIAN_BANKS

  const filteredBankGroup: BankOption[] = filteredBanks.filter(b => b.type === 'bank')
  const filteredEwalletGroup: BankOption[] = filteredBanks.filter(b => b.type === 'ewallet')

  const handleBankSelect = (bank: BankOption) => {
    setSelectedBank(bank)
    setAccountName(bank.name)
    setBankSearch('')
    setIsBankPopoverOpen(false)
  }

  const handleClearBank = () => {
    setSelectedBank(null)
    setBankSearch('')
  }

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name')
      return
    }

    if (accountName.trim().length < 3) {
      setError('Account name must be at least 3 characters')
      return
    }

    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    Analytics.track('onboarding_account_create_clicked', {
      account_type: accountType,
      has_bank: !!selectedBank,
      timestamp: new Date().toISOString()
    })

    setIsSubmitting(true)
    setError(null)

    try {
      const accountData = {
        user_id: user.id,
        name: accountName.trim(),
        type: accountType as 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER',
        balance,
        currency,
        is_active: true,
        is_default: true,
        description: selectedBank ? selectedBank.name : null
      }

      if (isPreviewMode) {
        setWizardData({ account: accountData })
        await nextPhase()
        return
      }

      await createAccount(accountData)
      setWizardData({ account: accountData })

      Analytics.track('onboarding_account_created', {
        account_type: accountType,
        bank_name: selectedBank?.name ?? null,
        has_bank_selected: !!selectedBank,
        has_balance: balance > 0,
        timestamp: new Date().toISOString()
      })

      await nextPhase()
    } catch (err) {
      console.error('Error creating account:', err)
      Analytics.track('onboarding_account_creation_failed', {
        account_type: accountType,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
      setError('Failed to create account. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipStep = async () => {
    Analytics.track('onboarding_step_skipped', {
      phase: 'account_setup',
      timestamp: new Date().toISOString()
    })
    await nextPhase()
  }

  const selectedType = ACCOUNT_TYPES.find(t => t.value === accountType)
  const selectedBankId = selectedBank?.id

  return (
    <div className="space-y-2">
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
      {(accountType === 'BANK' || accountType === 'OTHER') && (
        <div className="space-y-2">
          <Label>
            Bank / Institution{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>

          <Popover open={isBankPopoverOpen} onOpenChange={setIsBankPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className={cn(
                  'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                  selectedBank ? 'text-foreground' : 'text-muted-foreground',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <span className="flex items-center gap-2">
                  {selectedBank ? (
                    <>
                      <span className="text-base">{selectedBank.logo}</span>
                      <span className="font-medium">{selectedBank.name}</span>
                    </>
                  ) : (
                    'Search banks & e-wallets…'
                  )}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start" portalled={false}>
              {selectedBank && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="text-base">{selectedBank.logo}</span>
                  <span className="flex-1 font-medium">{selectedBank.name}</span>
                  <button
                    type="button"
                    onClick={handleClearBank}
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear bank selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <Input
                placeholder="Search…"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className={cn('h-8', selectedBank ? 'mt-2 mb-2' : 'mb-2')}
              />
              <ScrollArea className="max-h-56 overflow-auto">
                {filteredBankGroup.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Banks
                    </p>
                    {filteredBankGroup.map((bank: BankOption) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
                        aria-selected={selectedBankId === bank.id}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                          selectedBankId === bank.id && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <span className="text-base">{bank.logo}</span>
                        <span className="flex-1 text-left">{bank.name}</span>
                        {selectedBankId === bank.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {filteredEwalletGroup.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      E-Wallets
                    </p>
                    {filteredEwalletGroup.map((bank: BankOption) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
                        aria-selected={selectedBankId === bank.id}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                          selectedBankId === bank.id && 'bg-accent text-accent-foreground'
                        )}
                      >
                        <span className="text-base">{bank.logo}</span>
                        <span className="flex-1 text-left">{bank.name}</span>
                        {selectedBankId === bank.id && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {filteredBanks.length === 0 && (
                  <p className="px-2 py-4 text-sm text-center text-muted-foreground">
                    No results for &ldquo;{bankSearch}&rdquo;
                  </p>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}

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
        {accountName.trim().length > 0 && accountName.trim().length < 3 && (
          <p className="text-xs text-destructive">At least 3 characters required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency *</Label>
        <Select
          value={currency}
          onValueChange={setCurrency}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Starting Balance */}
      <div className="space-y-2">
        <Label htmlFor="balance">
          Starting Balance{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <CurrencyInput
          id="balance"
          value={balance}
          onChange={setBalance}
          currency={currency}
          placeholder="0"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Enter your current balance — you can update this anytime
        </p>
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
          disabled={isSubmitting || !accountName.trim() || accountName.trim().length < 3}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
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
