'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { preferences } from '@/lib/api/user-preferences'
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
  CheckCircle2,
  ChevronsUpDown,
  X,
  Home,
  Car,
  Landmark
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { INDONESIAN_BANKS, type BankOption } from '@/lib/constants/banks'
import { DialogFooter } from '@/components/ui/molecules/dialog'

type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND'
const ASSET_ACCOUNT_TYPES = new Set(['PROPERTY', 'VEHICLE', 'MORTGAGE'])

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Bank Account', icon: Banknote, description: 'Checking or savings account' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, description: 'Credit card account' },
  { value: 'CASH', label: 'Cash', icon: Wallet, description: 'Cash on hand' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet', icon: Smartphone, description: 'GoPay, OVO, Dana, etc.' },
  { value: 'INVESTMENT', label: 'Investment', icon: PiggyBank, description: 'Stocks, bonds, mutual funds' },
  { value: 'PROPERTY', label: 'Property', icon: Home, description: 'House, apartment, or land' },
  { value: 'VEHICLE', label: 'Vehicle', icon: Car, description: 'Car, motorcycle, etc.' },
  { value: 'MORTGAGE', label: 'Mortgage / KPR', icon: Landmark, description: 'Home loan or mortgage' },
  { value: 'OTHER', label: 'Other', icon: Wallet, description: 'Anything else' }
]

// Display order for the account-type tile grid. All types are tappable cards;
// no dropdown fallback.
const TYPE_CARD_ORDER = [
  'BANK',
  'CASH',
  'DIGITAL_WALLET',
  'CREDIT_CARD',
  'INVESTMENT',
  'PROPERTY',
  'VEHICLE',
  'MORTGAGE',
  'OTHER',
] as const

const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' }
]

export function AccountSetupStepModal() {
  const t = useTranslations('onboarding.accountSetup')
  const { user } = useAuth()
  const { nextPhase, setWizardData, isPreviewMode } = useOnboarding()
  const { createAccount, deleteAccount } = useAccounts()

  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<string>('BANK')
  const [currency, setCurrency] = useState('IDR')
  const [currencyPrefilled, setCurrencyPrefilled] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null)
  const [bankSearch, setBankSearch] = useState('')
  const [isBankPopoverOpen, setIsBankPopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Asset-specific fields — mirror AccountManager so onboarding captures the
  // same data shape. Kept as local state so each type renders only the fields
  // it needs; defaults match AccountManager (15% depreciation).
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('')
  const [assetLocation, setAssetLocation] = useState('')
  const [depreciationRate, setDepreciationRate] = useState('15')
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0)
  const [mortgageEndDate, setMortgageEndDate] = useState('')

  useEffect(() => {
    Analytics.track('onboarding_account_setup_viewed', {
      phase: 'account_setup',
      timestamp: new Date().toISOString()
    })
  }, [])

  // Pre-fill currency from user_settings.default_currency (set at registration)
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    preferences
      .getCurrency(user.id)
      .then(registered => {
        if (cancelled) return
        if (registered && registered !== 'IDR') {
          setCurrency(registered)
          setCurrencyPrefilled(true)
        } else if (registered === 'IDR') {
          // Still show the hint if the user explicitly chose IDR on registration
          setCurrencyPrefilled(true)
        }
      })
      .catch(() => {
        // Silent fallback — IDR default already set
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

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
    // Auto-fill the account name from the selected bank so users don't need
    // to retype it (matches redesign "Auto-filled from bank selection" hint).
    if (!accountName.trim()) {
      setAccountName(bank.name)
    }
    setBankSearch('')
    setIsBankPopoverOpen(false)
  }

  const handleClearBank = () => {
    setSelectedBank(null)
    setBankSearch('')
  }

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      setError(t('errors.enterName'))
      return
    }

    if (accountName.trim().length < 3) {
      setError(t('errors.minChars'))
      return
    }

    if (!user?.id) {
      setError(t('errors.notAuthenticated'))
      return
    }

    Analytics.track('onboarding_account_create_clicked', {
      account_type: accountType,
      has_bank: !!selectedBank,
      timestamp: new Date().toISOString()
    })

    setIsSubmitting(true)
    setError(null)

    const accountData = {
      user_id: user.id,
      name: accountName.trim(),
      type: accountType as 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE' | 'DIGITAL_WALLET',
      balance,
      currency,
      is_active: true,
      is_default: true,
      description: selectedBank ? selectedBank.name : null,
      // Asset-specific fields — only populated when the type needs them so
      // we don't stash stale state from a previous type selection.
      property_type: accountType === 'PROPERTY' ? (propertyType || null) : null,
      asset_location: accountType === 'PROPERTY' ? (assetLocation.trim() || null) : null,
      depreciation_rate:
        accountType === 'VEHICLE'
          ? (parseFloat(depreciationRate) || 15)
          : null,
      monthly_payment:
        accountType === 'MORTGAGE' && monthlyPayment > 0 ? monthlyPayment : null,
      mortgage_end_date:
        accountType === 'MORTGAGE' && mortgageEndDate ? mortgageEndDate : null,
      // New per-type creation fields (all null in the onboarding wizard; full
      // editing is handled in the account creation flow for each type).
      purchase_date: null,
      credit_limit: null,
      statement_day: null,
      due_day: null,
      vehicle_type: null,
      broker: null,
      interest_rate: null,
      loan_term_months: null,
      down_payment: null,
      investment_goal: null,
    }

    if (isPreviewMode) {
      try {
        setWizardData({ account: accountData })
        await nextPhase()
      } catch (err) {
        console.error('Error advancing phase in preview:', err)
        setError(t('errors.failedToCreate'))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Atomic-ish flow with rollback: if nextPhase fails after the account was
    // created, delete the orphan account so the user can retry cleanly on the
    // same step without a stuck half-created record.
    let createdAccountId: string | null = null
    try {
      const created = await createAccount(accountData)
      createdAccountId = created?.id ?? null
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

      // Roll back a successfully created account if the phase advance failed.
      if (createdAccountId) {
        try {
          await deleteAccount(createdAccountId)
        } catch (rollbackErr) {
          console.warn('Rollback of orphan account failed:', rollbackErr)
        }
      }

      setError(t('errors.failedToCreate'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedBankId = selectedBank?.id

  return (
    // Flex column owning its own scrollable body + pinned footer.
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
      {/* Account Type — all types rendered as tappable tiles */}
      <div className="space-y-2">
        <Label>{t('accountTypeLabel')}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_CARD_ORDER.map(value => {
            const type = ACCOUNT_TYPES.find(t => t.value === value)!
            const Icon = type.icon
            const isSelected = accountType === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                disabled={isSubmitting}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 transition-colors min-h-[84px] text-center',
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                )}
                aria-pressed={isSelected}
              >
                <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-xs font-semibold leading-tight">
                  {t(`accountTypes.${value}.label` as Parameters<typeof t>[0])}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(`accountTypes.${accountType}.description` as Parameters<typeof t>[0])}
        </p>
      </div>
      {(accountType === 'BANK' || accountType === 'OTHER') && (
        <div className="space-y-2">
          <Label>
            {t('bankInstitution')}{' '}
            <span className="text-muted-foreground font-normal">{t('optional')}</span>
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
                    t('searchBanks')
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
                      {t('banks')}
                    </p>
                    {filteredBankGroup.map((bank: BankOption) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
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
                      {t('eWallets')}
                    </p>
                    {filteredEwalletGroup.map((bank: BankOption) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => handleBankSelect(bank)}
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
                    {t('noResults', { search: bankSearch })}
                  </p>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="accountName">{t('accountNameLabel')}</Label>
        <Input
          id="accountName"
          placeholder={t('accountNamePlaceholder')}
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          disabled={isSubmitting}
        />
        {accountName.trim().length > 0 && accountName.trim().length < 3 && (
          <p className="text-xs text-destructive">{t('atLeast3Chars')}</p>
        )}
        {selectedBank && accountName === selectedBank.name && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('autoFilledFromBank')}
          </p>
        )}
      </div>

      {/* Asset-specific fields — same inputs as AccountManager so the data
          captured during onboarding matches what users can edit later. */}
      {accountType === 'PROPERTY' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="property-type">{t('assetDetails.propertyType')}</Label>
            <Select
              value={propertyType || undefined}
              onValueChange={(v) => setPropertyType(v as PropertyType)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="property-type">
                <SelectValue placeholder={t('assetDetails.propertyTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOUSE">{t('assetDetails.propertyTypes.house')}</SelectItem>
                <SelectItem value="APARTMENT">{t('assetDetails.propertyTypes.apartment')}</SelectItem>
                <SelectItem value="LAND">{t('assetDetails.propertyTypes.land')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-location">{t('assetDetails.location')}</Label>
            <Input
              id="asset-location"
              value={assetLocation}
              onChange={(e) => setAssetLocation(e.target.value)}
              placeholder={t('assetDetails.locationPlaceholder')}
              disabled={isSubmitting}
            />
          </div>
        </>
      )}

      {accountType === 'VEHICLE' && (
        <div className="space-y-2">
          <Label htmlFor="depreciation-rate">{t('assetDetails.depreciationRate')}</Label>
          <Input
            id="depreciation-rate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={depreciationRate}
            onChange={(e) => setDepreciationRate(e.target.value)}
            placeholder={t('assetDetails.depreciationRatePlaceholder')}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">{t('assetDetails.depreciationRateHint')}</p>
        </div>
      )}

      {accountType === 'MORTGAGE' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="monthly-payment">{t('assetDetails.monthlyPayment')}</Label>
            <CurrencyInput
              id="monthly-payment"
              value={monthlyPayment}
              onChange={setMonthlyPayment}
              currency={currency}
              placeholder="0"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mortgage-end-date">{t('assetDetails.mortgageEndDate')}</Label>
            <Input
              id="mortgage-end-date"
              type="month"
              value={mortgageEndDate ? mortgageEndDate.slice(0, 7) : ''}
              onChange={(e) => setMortgageEndDate(e.target.value ? `${e.target.value}-01` : '')}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">{t('assetDetails.mortgageEndDateHint')}</p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="currency">{t('currencyLabel')}</Label>
        <Select
          value={currency}
          onValueChange={(v) => {
            setCurrency(v)
            setCurrencyPrefilled(false)
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectCurrency')} />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currencyPrefilled && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('currencyFromRegistration')}
          </p>
        )}
      </div>

      {/* Starting Balance — label & helper copy depend on the account type so
          asset accounts explain "current value" vs. "outstanding balance". */}
      <div className="space-y-2">
        <Label htmlFor="balance">
          {accountType === 'PROPERTY' || accountType === 'VEHICLE' || accountType === 'MORTGAGE'
            ? t(
                `assetDetails.balanceLabel.${accountType.toLowerCase() as 'property' | 'vehicle' | 'mortgage'}`
              )
            : t('startingBalance')}{' '}
          {!ASSET_ACCOUNT_TYPES.has(accountType) && (
            <span className="text-muted-foreground font-normal">{t('optional')}</span>
          )}
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
          {accountType === 'PROPERTY' || accountType === 'VEHICLE' || accountType === 'MORTGAGE'
            ? t(
                `assetDetails.balanceHint.${accountType.toLowerCase() as 'property' | 'vehicle' | 'mortgage'}`
              )
            : t('balanceNote')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      </div>

      {/* Footer — pinned to the bottom of the dialog. No skip per design
          (pen frame qBGbD has Back + Continue only — see GMeBQ / JyBux).
          Welcome and Completion still expose skip text links. */}
      <div className="flex gap-3 justify-end pt-3 mt-3 border-t">
        <Button
          onClick={handleCreateAccount}
          disabled={isSubmitting || !accountName.trim() || accountName.trim().length < 3}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('creating')}
            </>
          ) : (
            <>
              {t('continue')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
