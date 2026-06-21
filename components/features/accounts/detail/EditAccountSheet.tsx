'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/molecules/dialog'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/molecules/select'
import { useAccounts, AccountWithHistory } from '@/contexts/AccountContext'
import { AccountDB } from '@/types/database'

const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
]

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet' },
  { value: 'PROPERTY', label: 'Property' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'MORTGAGE', label: 'Mortgage / KPR' },
  { value: 'OTHER', label: 'Other' },
] as const

type AccountType =
  | 'BANK'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'INVESTMENT'
  | 'OTHER'
  | 'PROPERTY'
  | 'VEHICLE'
  | 'MORTGAGE'
  | 'DIGITAL_WALLET'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: AccountWithHistory
}

export function EditAccountSheet({ open, onOpenChange, account }: Props) {
  const t = useTranslations('accountDetail')
  const { updateAccount } = useAccounts()

  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState<string>('')
  const [editCurrency, setEditCurrency] = useState('')
  const [editType, setEditType] = useState<AccountType>('BANK')
  const [editDescription, setEditDescription] = useState('')
  const [currencyConversionMode, setCurrencyConversionMode] = useState<'keep' | 'convert'>('keep')
  const [originalCurrency, setOriginalCurrency] = useState('')

  // Seed local form state from the account whenever the dialog opens.
  useEffect(() => {
    if (open && account) {
      setEditName(account.name)
      setEditBalance(account.balance.toString())
      setEditCurrency(account.currency)
      setEditType(account.type as AccountType)
      setEditDescription(account.description || '')
      setOriginalCurrency(account.currency)
      setCurrencyConversionMode('keep')
    }
  }, [open, account])

  // Check if currency has changed
  const currencyChanged = editCurrency !== originalCurrency

  const handleUpdate = async () => {
    try {
      // Balance is intentionally omitted: accounts.balance is the opening anchor and
      // is never overwritten through the generic account update. To change the current
      // balance, use the Adjust dialog, which records the delta as an adjustment
      // transaction (POST /api/accounts/[accountId]/adjust-balance).
      const updateData: Partial<AccountDB> = {
        name: editName,
        currency: editCurrency,
        type: editType,
        description: editDescription || null,
      }

      await updateAccount(account.id, updateData)
      toast.success('Account updated successfully')
      onOpenChange(false)
      // Reset original currency for future edits
      setOriginalCurrency(editCurrency)
    } catch {
      toast.error('Failed to update account')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editDialog.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Account Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t('editDialog.name')}
            </Label>
            <Input
              id="name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Account Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t('editDialog.type')}
            </Label>
            <Select value={editType} onValueChange={(value) => setEditType(value as AccountType)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t('editDialog.selectAccountType')} />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">
              {t('editDialog.currency')}
            </Label>
            <Select value={editCurrency} onValueChange={setEditCurrency}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t('editDialog.selectCurrency')} />
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

          {/* Currency Conversion Option - only show when currency changes */}
          {currencyChanged && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {t('editDialog.amount')}
              </Label>
              <div className="col-span-3 space-y-3">
                <p className="text-sm leading-body-sm text-muted-foreground">
                  {t('editDialog.currencyChangedNote', { from: originalCurrency, to: editCurrency })}
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCurrencyConversionMode('keep')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      currencyConversionMode === 'keep'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      currencyConversionMode === 'keep' ? 'border-primary' : 'border-muted-foreground'
                    }`}>
                      {currencyConversionMode === 'keep' && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm leading-body-sm">
                      {t('editDialog.keepValue', { balance: editBalance, currency: editCurrency })}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border text-left opacity-50 cursor-not-allowed"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                    <span className="text-sm leading-body-sm text-muted-foreground">
                      {t('editDialog.convertAmount')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              {t('editDialog.descriptionLabel')}
            </Label>
            <Input
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder={t('editDialog.descriptionPlaceholder')}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('editDialog.cancel')}</Button>
          <Button type="submit" onClick={handleUpdate}>{t('editDialog.saveChanges')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
