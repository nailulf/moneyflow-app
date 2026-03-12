'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/atoms/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/organisms/sheet'
import { Input } from '@/components/ui/atoms/input'
import { Plus, CreditCard, Search, Loader2, Trash2, Edit, ExternalLink, ArrowLeft, Building2, Wallet, TrendingUp, Home, Car, Landmark } from 'lucide-react'
import { AccountDB } from '@/types/database'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, parseCurrencyAmount } from '@/lib/data-utils'
import { Analytics } from '@/lib/analytics/amplitude'
import { useIsMobile } from '@/hooks/use-mobile'

type Mode = 'list' | 'create' | 'edit' | 'delete'
type AccountType = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE'
type PropertyType = 'HOUSE' | 'APARTMENT' | 'LAND'

const ASSET_TYPES: AccountType[] = ['PROPERTY', 'VEHICLE', 'MORTGAGE']

const ACCOUNT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  PROPERTY: Home,
  VEHICLE: Car,
  MORTGAGE: Landmark,
  OTHER: CreditCard,
}

type AccountGroup = { labelKey: string; types: AccountType[] }
const ACCOUNT_GROUPS: AccountGroup[] = [
  { labelKey: 'groups.savingsInvestment', types: ['BANK', 'INVESTMENT'] },
  { labelKey: 'groups.assets',            types: ['PROPERTY', 'VEHICLE'] },
  { labelKey: 'groups.liabilities',       types: ['MORTGAGE'] },
  { labelKey: 'groups.other',             types: ['CASH', 'CREDIT_CARD', 'OTHER'] },
]

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

interface AccountManagerProps {
  onAccountUpdated?: () => void
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: 'sheet' | 'embedded'
  defaultMode?: Mode
}

function AccountManagerInternal({
  onAccountUpdated,
  className = '',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  variant = 'sheet',
  defaultMode
}: AccountManagerProps) {
  const isEmbedded = variant === 'embedded'
  const router = useRouter()
  const isMobile = useIsMobile()
  const t = useTranslations('accountManager')
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? (controlledOnOpenChange ?? setInternalOpen) : setInternalOpen
  const { user } = useAuth()
  const userId = user?.id || ''
  const {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount
  } = useAccounts()

  const [mode, setMode] = useState<Mode>(defaultMode ?? 'list')

  // When the sheet opens, jump to defaultMode (e.g. 'create') if specified
  useEffect(() => {
    if (isOpen && defaultMode) {
      if (defaultMode === 'create') openCreateMode()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  // New account form state
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState('bank')
  const [newAccountCurrency, setNewAccountCurrency] = useState('IDR')
  const [newAccountBalance, setNewAccountBalance] = useState('0')
  // Asset-specific fields (create)
  const [newPropertyType, setNewPropertyType] = useState<PropertyType | ''>('')
  const [newAssetLocation, setNewAssetLocation] = useState('')
  const [newDepreciationRate, setNewDepreciationRate] = useState('15')
  const [newMonthlyPayment, setNewMonthlyPayment] = useState('')
  const [newMortgageEndDate, setNewMortgageEndDate] = useState('')

  // Edit account form state
  const [editAccountName, setEditAccountName] = useState('')
  const [editAccountType, setEditAccountType] = useState('bank')
  // Asset-specific fields (edit)
  const [editPropertyType, setEditPropertyType] = useState<PropertyType | ''>('')
  const [editAssetLocation, setEditAssetLocation] = useState('')
  const [editDepreciationRate, setEditDepreciationRate] = useState('15')
  const [editMonthlyPayment, setEditMonthlyPayment] = useState('')
  const [editMortgageEndDate, setEditMortgageEndDate] = useState('')

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedAccount = accounts.find(account => account.id === selectedAccountId)

  const resetToList = () => {
    setMode('list')
    setSelectedAccountId(null)
  }

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) resetToList()
    setIsOpen(open)
  }

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return
    setIsSubmitting(true)
    const accountType = newAccountType.toUpperCase() as AccountType
    try {
      const assetFields: Partial<AccountDB> = {}
      if (accountType === 'PROPERTY') {
        assetFields.property_type = (newPropertyType as PropertyType) || null
        assetFields.asset_location = newAssetLocation.trim() || null
      } else if (accountType === 'VEHICLE') {
        assetFields.depreciation_rate = parseFloat(newDepreciationRate) || 15
      } else if (accountType === 'MORTGAGE') {
        if (newMonthlyPayment) assetFields.monthly_payment = parseCurrencyAmount(newMonthlyPayment)
        if (newMortgageEndDate) assetFields.mortgage_end_date = newMortgageEndDate
      }

      const newAccount = await createAccount({
        user_id: userId,
        name: newAccountName.trim(),
        type: accountType,
        balance: parseCurrencyAmount(newAccountBalance),
        currency: newAccountCurrency,
        is_active: true,
        is_default: false,
        description: null,
        property_type: null,
        asset_location: null,
        depreciation_rate: null,
        monthly_payment: null,
        mortgage_end_date: null,
        ...assetFields,
      })
      Analytics.track('Account Created', {
        account_id: newAccount.id,
        account_type: newAccount.type,
        account_name: newAccount.name,
        initial_balance: newAccount.balance,
        source: 'settings'
      })
      onAccountUpdated?.()
      setNewAccountName('')
      setNewAccountType('bank')
      setNewAccountCurrency('IDR')
      setNewAccountBalance('0')
      setNewPropertyType('')
      setNewAssetLocation('')
      setNewDepreciationRate('15')
      setNewMonthlyPayment('')
      setNewMortgageEndDate('')
      resetToList()
    } catch (err) {
      console.error('Failed to add account:', err)
      Analytics.track('Account Creation Failed', {
        account_type: accountType,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAccount = async () => {
    if (!selectedAccountId || !editAccountName.trim()) return
    setIsSubmitting(true)
    const accountType = editAccountType.toUpperCase() as AccountType
    try {
      const fieldsChanged: string[] = []
      if (selectedAccount?.name !== editAccountName.trim()) fieldsChanged.push('name')
      if (selectedAccount?.type.toLowerCase() !== editAccountType) fieldsChanged.push('type')

      const assetFields: Partial<AccountDB> = {}
      if (accountType === 'PROPERTY') {
        assetFields.property_type = editPropertyType || null
        assetFields.asset_location = editAssetLocation.trim() || null
      } else if (accountType === 'VEHICLE') {
        assetFields.depreciation_rate = parseFloat(editDepreciationRate) || 15
      } else if (accountType === 'MORTGAGE') {
        assetFields.monthly_payment = editMonthlyPayment ? parseCurrencyAmount(editMonthlyPayment) : null
        assetFields.mortgage_end_date = editMortgageEndDate || null
      }

      await updateAccount(selectedAccountId, {
        name: editAccountName.trim(),
        type: accountType,
        ...assetFields
      })
      Analytics.track('Account Updated', {
        account_id: selectedAccountId,
        fields_changed: fieldsChanged,
        new_type: accountType,
        new_name: editAccountName.trim()
      })
      onAccountUpdated?.()
      resetToList()
    } catch (err) {
      console.error('Failed to update account:', err)
      Analytics.track('Account Update Failed', {
        account_id: selectedAccountId,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedAccountId || !selectedAccount) return
    setIsSubmitting(true)
    try {
      const accountInfo = { id: selectedAccount.id, type: selectedAccount.type, name: selectedAccount.name }
      await deleteAccount(selectedAccountId)
      Analytics.track('Account Deleted', {
        account_id: accountInfo.id,
        account_type: accountInfo.type,
        account_name: accountInfo.name
      })
      onAccountUpdated?.()
      resetToList()
    } catch (err) {
      console.error('Failed to delete account:', err)
      Analytics.track('Account Deletion Failed', {
        account_id: selectedAccountId,
        account_type: selectedAccount?.type,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCreateMode = () => {
    setNewAccountName('')
    setNewAccountType('bank')
    setNewAccountCurrency('IDR')
    setNewAccountBalance('0')
    setNewPropertyType('')
    setNewAssetLocation('')
    setNewDepreciationRate('15')
    setNewMonthlyPayment('')
    setNewMortgageEndDate('')
    setMode('create')
    Analytics.track('Add Account Form Opened', { trigger: 'add_button' })
  }

  const openEditMode = (account: AccountDB) => {
    setSelectedAccountId(account.id)
    setEditAccountName(account.name)
    setEditAccountType(account.type.toLowerCase())
    setEditPropertyType((account.property_type as PropertyType) || '')
    setEditAssetLocation(account.asset_location || '')
    setEditDepreciationRate(account.depreciation_rate != null ? String(account.depreciation_rate) : '15')
    setEditMonthlyPayment(account.monthly_payment != null ? String(account.monthly_payment) : '')
    setEditMortgageEndDate(account.mortgage_end_date || '')
    setMode('edit')
    Analytics.track('Edit Account Form Opened', {
      account_id: account.id,
      account_type: account.type,
      trigger: 'account_list'
    })
  }

  const openDeleteMode = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    setSelectedAccountId(accountId)
    setMode('delete')
    Analytics.track('Delete Account Dialog Opened', {
      account_id: accountId,
      account_type: account?.type,
      trigger: 'account_list'
    })
  }

  const listContent = (
    <>
      <SheetHeader>
        <SheetTitle>{t('title')}</SheetTitle>
        <SheetDescription>
          {t('description')}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">{t('loadingAccounts')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isEmbedded && (
              <Button onClick={openCreateMode} className="w-full" disabled={isSubmitting}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addNewAccount')}
              </Button>
            )}

            <div className="space-y-3">
              <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t('yourAccounts', { count: filteredAccounts.length })}
              </div>
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? t('noAccountsSearch') : t('noAccounts')}
                </div>
              ) : (
                <div className="space-y-4">
                  {ACCOUNT_GROUPS.map((group) => {
                    const groupAccounts = filteredAccounts.filter(a =>
                      group.types.includes(a.type as AccountType)
                    )
                    if (groupAccounts.length === 0) return null
                    const isLiability = group.labelKey === 'groups.liabilities'
                    return (
                      <div key={group.labelKey}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
                          {t(group.labelKey)}
                        </p>
                        <div className="space-y-2">
                          {groupAccounts.map((account) => {
                            const Icon = ACCOUNT_ICONS[account.type] || CreditCard
                            return (
                              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0 text-muted-foreground">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-sm text-foreground truncate">{account.name}</span>
                                      {account.is_default && (
                                        <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full shrink-0">{t('default')}</span>
                                      )}
                                    </div>
                                    <span className={`text-xs ${isLiability ? 'text-destructive' : (account.currentBalance ?? account.balance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                      {formatCurrency(account.currentBalance ?? account.balance)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/accounts?accountId=${account.id}`)}
                                    className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
                                    title="View Details"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditMode(account)}
                                    className="h-11 w-11 p-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
                                    disabled={isSubmitting}
                                    title="Edit Account"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!account.is_default && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteMode(account.id)}
                                      className="h-11 w-11 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 sm:h-8 sm:w-8"
                                      disabled={isSubmitting}
                                      title="Delete Account"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!isEmbedded && (
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">{t('close')}</Button>
          </SheetClose>
          <Button onClick={openCreateMode} disabled={isSubmitting}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addAccount')}
          </Button>
        </SheetFooter>
      )}
    </>
  )

  const isAssetType = (type: string) => ASSET_TYPES.includes(type.toUpperCase() as AccountType)

  const assetFieldsCreate = (
    <>
      {newAccountType === 'property' && (
        <>
          <div className="space-y-2">
            <label htmlFor="property-type" className="text-sm font-medium">{t('assetDetails.propertyType')}</label>
            <select
              id="property-type"
              value={newPropertyType}
              onChange={(e) => setNewPropertyType(e.target.value as PropertyType | '')}
              className={selectClass}
            >
              <option value="">{t('assetDetails.propertyTypePlaceholder')}</option>
              <option value="HOUSE">{t('assetDetails.propertyTypes.house')}</option>
              <option value="APARTMENT">{t('assetDetails.propertyTypes.apartment')}</option>
              <option value="LAND">{t('assetDetails.propertyTypes.land')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="asset-location" className="text-sm font-medium">{t('assetDetails.location')}</label>
            <Input
              id="asset-location"
              value={newAssetLocation}
              onChange={(e) => setNewAssetLocation(e.target.value)}
              placeholder={t('assetDetails.locationPlaceholder')}
            />
          </div>
        </>
      )}
      {newAccountType === 'vehicle' && (
        <div className="space-y-2">
          <label htmlFor="depreciation-rate" className="text-sm font-medium">{t('assetDetails.depreciationRate')}</label>
          <Input
            id="depreciation-rate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={newDepreciationRate}
            onChange={(e) => setNewDepreciationRate(e.target.value)}
            placeholder={t('assetDetails.depreciationRatePlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('assetDetails.depreciationRateHint')}</p>
        </div>
      )}
      {newAccountType === 'mortgage' && (
        <>
          <div className="space-y-2">
            <label htmlFor="monthly-payment" className="text-sm font-medium">{t('assetDetails.monthlyPayment')}</label>
            <Input
              id="monthly-payment"
              type="number"
              min="0"
              step="0.01"
              value={newMonthlyPayment}
              onChange={(e) => setNewMonthlyPayment(e.target.value)}
              placeholder={t('assetDetails.monthlyPaymentPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="mortgage-end-date" className="text-sm font-medium">{t('assetDetails.mortgageEndDate')}</label>
            <Input
              id="mortgage-end-date"
              type="month"
              value={newMortgageEndDate}
              onChange={(e) => setNewMortgageEndDate(e.target.value ? `${e.target.value}-01` : '')}
            />
            <p className="text-xs text-muted-foreground">{t('assetDetails.mortgageEndDateHint')}</p>
          </div>
        </>
      )}
    </>
  )

  const assetFieldsEdit = (
    <>
      {editAccountType === 'property' && (
        <>
          <div className="space-y-2">
            <label htmlFor="edit-property-type" className="text-sm font-medium">{t('assetDetails.propertyType')}</label>
            <select
              id="edit-property-type"
              value={editPropertyType}
              onChange={(e) => setEditPropertyType(e.target.value as PropertyType | '')}
              className={selectClass}
            >
              <option value="">{t('assetDetails.propertyTypePlaceholder')}</option>
              <option value="HOUSE">{t('assetDetails.propertyTypes.house')}</option>
              <option value="APARTMENT">{t('assetDetails.propertyTypes.apartment')}</option>
              <option value="LAND">{t('assetDetails.propertyTypes.land')}</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-asset-location" className="text-sm font-medium">{t('assetDetails.location')}</label>
            <Input
              id="edit-asset-location"
              value={editAssetLocation}
              onChange={(e) => setEditAssetLocation(e.target.value)}
              placeholder={t('assetDetails.locationPlaceholder')}
            />
          </div>
        </>
      )}
      {editAccountType === 'vehicle' && (
        <div className="space-y-2">
          <label htmlFor="edit-depreciation-rate" className="text-sm font-medium">{t('assetDetails.depreciationRate')}</label>
          <Input
            id="edit-depreciation-rate"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={editDepreciationRate}
            onChange={(e) => setEditDepreciationRate(e.target.value)}
            placeholder={t('assetDetails.depreciationRatePlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('assetDetails.depreciationRateHint')}</p>
        </div>
      )}
      {editAccountType === 'mortgage' && (
        <>
          <div className="space-y-2">
            <label htmlFor="edit-monthly-payment" className="text-sm font-medium">{t('assetDetails.monthlyPayment')}</label>
            <Input
              id="edit-monthly-payment"
              type="number"
              min="0"
              step="0.01"
              value={editMonthlyPayment}
              onChange={(e) => setEditMonthlyPayment(e.target.value)}
              placeholder={t('assetDetails.monthlyPaymentPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-mortgage-end-date" className="text-sm font-medium">{t('assetDetails.mortgageEndDate')}</label>
            <Input
              id="edit-mortgage-end-date"
              type="month"
              value={editMortgageEndDate ? editMortgageEndDate.slice(0, 7) : ''}
              onChange={(e) => setEditMortgageEndDate(e.target.value ? `${e.target.value}-01` : '')}
            />
            <p className="text-xs text-muted-foreground">{t('assetDetails.mortgageEndDateHint')}</p>
          </div>
        </>
      )}
    </>
  )

  const createContent = (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={resetToList} className="h-8 w-8 -ml-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <SheetTitle>{t('create.title')}</SheetTitle>
        </div>
        <SheetDescription>{t('create.description')}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="account-name" className="text-sm font-medium">{t('create.name')}</label>
          <Input
            id="account-name"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder={t('create.namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="account-type" className="text-sm font-medium">{t('create.type')}</label>
          <select
            id="account-type"
            value={newAccountType}
            onChange={(e) => {
              setNewAccountType(e.target.value)
              setNewDepreciationRate('15')
            }}
            className={selectClass}
          >
            <option value="bank">{t('accountTypes.bank')}</option>
            <option value="credit_card">{t('accountTypes.creditCard')}</option>
            <option value="cash">{t('accountTypes.cash')}</option>
            <option value="investment">{t('accountTypes.investment')}</option>
            <option value="property">{t('accountTypes.property')}</option>
            <option value="vehicle">{t('accountTypes.vehicle')}</option>
            <option value="mortgage">{t('accountTypes.mortgage')}</option>
            <option value="other">{t('accountTypes.other')}</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="account-currency" className="text-sm font-medium">{t('create.currency')}</label>
          <select
            id="account-currency"
            value={newAccountCurrency}
            onChange={(e) => setNewAccountCurrency(e.target.value)}
            className={selectClass}
          >
            <option value="IDR">IDR — Indonesian Rupiah (Rp)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="EUR">EUR — Euro (€)</option>
            <option value="GBP">GBP — British Pound (£)</option>
            <option value="JPY">JPY — Japanese Yen (¥)</option>
            <option value="SGD">SGD — Singapore Dollar (S$)</option>
            <option value="MYR">MYR — Malaysian Ringgit (RM)</option>
            <option value="AED">AED — UAE Dirham (Dhs)</option>
            <option value="SAR">SAR — Saudi Riyal (SR)</option>
          </select>
        </div>
        {assetFieldsCreate}
        <div className="space-y-2">
          <label htmlFor="account-balance" className="text-sm font-medium">
            {isAssetType(newAccountType) ? t(`assetDetails.balanceHint.${newAccountType as 'property' | 'vehicle' | 'mortgage'}`) : t('create.initialBalance')}
          </label>
          <Input
            id="account-balance"
            type="number"
            step="0.01"
            value={newAccountBalance}
            onChange={(e) => setNewAccountBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={resetToList} disabled={isSubmitting}>{t('create.cancel')}</Button>
        <Button onClick={handleAddAccount} disabled={!newAccountName.trim() || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('create.createAccount')}
        </Button>
      </SheetFooter>
    </>
  )

  const editContent = (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={resetToList} className="h-8 w-8 -ml-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <SheetTitle>{t('edit.title')}</SheetTitle>
        </div>
        <SheetDescription>{t('edit.description')}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="edit-account-name" className="text-sm font-medium">{t('edit.name')}</label>
          <Input
            id="edit-account-name"
            value={editAccountName}
            onChange={(e) => setEditAccountName(e.target.value)}
            placeholder={t('edit.namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="edit-account-type" className="text-sm font-medium">{t('edit.type')}</label>
          <select
            id="edit-account-type"
            value={editAccountType}
            onChange={(e) => {
              setEditAccountType(e.target.value)
              setEditDepreciationRate('15')
            }}
            className={selectClass}
          >
            <option value="bank">{t('accountTypes.bank')}</option>
            <option value="credit_card">{t('accountTypes.creditCard')}</option>
            <option value="cash">{t('accountTypes.cash')}</option>
            <option value="investment">{t('accountTypes.investment')}</option>
            <option value="property">{t('accountTypes.property')}</option>
            <option value="vehicle">{t('accountTypes.vehicle')}</option>
            <option value="mortgage">{t('accountTypes.mortgage')}</option>
            <option value="other">{t('accountTypes.other')}</option>
          </select>
        </div>
        {assetFieldsEdit}
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={resetToList} disabled={isSubmitting}>{t('edit.cancel')}</Button>
        <Button onClick={handleEditAccount} disabled={!editAccountName.trim() || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('edit.updateAccount')}
        </Button>
      </SheetFooter>
    </>
  )

  const deleteContent = (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={resetToList} className="h-8 w-8 -ml-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <SheetTitle>{t('delete.title')}</SheetTitle>
        </div>
        <SheetDescription>
          {t('delete.description', { name: selectedAccount?.name ?? '' })}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
        {selectedAccount?.is_default && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{t('delete.defaultWarning')}</p>
          </div>
        )}
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="font-medium text-sm">{selectedAccount?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {selectedAccount?.type.toLowerCase().replace('_', ' ')}
          </p>
        </div>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={resetToList} disabled={isSubmitting}>{t('delete.cancel')}</Button>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={isSubmitting || selectedAccount?.is_default}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('delete.deleteAccount')}
        </Button>
      </SheetFooter>
    </>
  )

  const currentContent = {
    list: listContent,
    create: createContent,
    edit: editContent,
    delete: deleteContent,
  }[mode]

  if (isEmbedded) {
    return <div className="flex flex-col gap-2">{currentContent}</div>
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <CreditCard className="h-4 w-4 mr-2" />
            {t('manageAccounts')}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'rounded-t-2xl overflow-hidden' : 'w-[400px] sm:w-[540px]'}
      >
        {currentContent}
      </SheetContent>
    </Sheet>
  )
}

export function AccountManager(props: AccountManagerProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return <AccountManagerInternal {...props} />
}
