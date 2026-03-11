'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AccountNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { ArrowLeft, CreditCard, Wallet, TrendingUp, Building2, Loader2, Edit, Trash2, Download, SlidersHorizontal } from 'lucide-react'
import { useAccounts, AccountWithHistory } from '@/contexts/AccountContext'
import { formatCurrency, parseCurrencyAmount } from '@/lib/data-utils'
import { GoalSection } from '@/components/features/goals'
import { AccountDB, BalanceAdjustment } from '@/types/database'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { queryKeys } from '@/hooks/useDataRefresh'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import { TransactionTable } from '@/components/features/transaction/TransactionTable'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/molecules/dialog'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/molecules/select'

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
  { value: 'PROPERTY', label: 'Property' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'MORTGAGE', label: 'Mortgage / KPR' },
  { value: 'OTHER', label: 'Other' },
] as const

const ACCOUNT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Building2,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENT: TrendingUp,
  OTHER: CreditCard
}

interface AccountDetailViewProps {
  accountId?: string
  isModal?: boolean
}

export function AccountDetailView({ accountId: propAccountId, isModal = false }: AccountDetailViewProps) {
  const params = useParams()
  const router = useRouter()
  // Use prop or param
  const accountId = propAccountId || (params.accountId as string)

  const t = useTranslations('accountDetail')
  const { user } = useAuth()
  const { accounts, loading, deleteAccount, updateAccount } = useAccounts()
  const [account, setAccount] = useState<AccountWithHistory | null>(null)
  
  // State for actions
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState<string>('')
  const [editCurrency, setEditCurrency] = useState('')
  const [editType, setEditType] = useState<'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER' | 'PROPERTY' | 'VEHICLE' | 'MORTGAGE'>('BANK')
  const [editDescription, setEditDescription] = useState('')
  const [currencyConversionMode, setCurrencyConversionMode] = useState<'keep' | 'convert'>('keep')
  const [originalCurrency, setOriginalCurrency] = useState('')

  // Adjust balance state
  const queryClient = useQueryClient()
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [adjustNewBalance, setAdjustNewBalance] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustDate, setAdjustDate] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Transactions
  const { transactions, isLoading: transactionsLoading } = useAllTransactions({
    userId: user?.id || '',
    accountId: accountId,
    enabled: !!user?.id && !!accountId
  })

  // Fetch balance adjustment log
  const { data: adjustments = [] } = useQuery<BalanceAdjustment[]>({
    queryKey: ['balance-adjustments', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/adjust-balance`)
      if (!res.ok) throw new Error('Failed to fetch adjustments')
      return res.json()
    },
    enabled: !!accountId,
  })

  const adjustmentTotal = useMemo(() => (
    adjustments.reduce((sum, adj) => sum + adj.adjustment_amount, 0)
  ), [adjustments])

  const initialBalance = useMemo(() => {
    if (!account) return 0
    const txEffect = transactions.reduce((sum, t) => {
      if (t.type === 'INCOME') return sum + t.amount
      if (t.type === 'EXPENSE') return sum - t.amount
      return sum
    }, 0)
    return account.balance - txEffect - adjustmentTotal
  }, [account, transactions, adjustmentTotal])

  // Real-time adjustment preview
  const currentBalance = account?.currentBalance ?? account?.balance ?? 0
  const parsedNewBalance = parseCurrencyAmount(adjustNewBalance)
  const adjustmentDiff = adjustNewBalance.trim() === '' ? null : parsedNewBalance - currentBalance

  useEffect(() => {
    if (!loading && accounts.length > 0) {
      const found = accounts.find(a => a.id === accountId)
      if (found) {
        setAccount(found)
        setEditName(found.name)
        setEditBalance(found.balance.toString())
        setEditCurrency(found.currency)
        setEditType(found.type)
        setEditDescription(found.description || '')
        setOriginalCurrency(found.currency)
      } else if (!isModal) {
        // Account not found, redirect only if not modal
        router.push('/accounts')
      }
    }
  }, [accounts, accountId, loading, router, isModal])

  const handleDelete = async () => {
    try {
      await deleteAccount(accountId)
      toast.success('Account deleted successfully')
      if (isModal) {
        router.back()
      } else {
        router.push('/accounts')
      }
    } catch (error) {
      toast.error('Failed to delete account')
    }
  }

  const handleUpdate = async () => {
    try {
      const balanceValue = parseCurrencyAmount(editBalance)
      if (balanceValue === 0 && editBalance.trim() !== '' && editBalance.trim() !== '0') {
        toast.error('Please enter a valid balance amount')
        return
      }

      const updateData: Partial<AccountDB> = {
        name: editName,
        balance: balanceValue,
        currency: editCurrency,
        type: editType,
        description: editDescription || null,
      }

      await updateAccount(accountId, updateData)
      toast.success('Account updated successfully')
      setIsEditOpen(false)
      // Reset original currency for future edits
      setOriginalCurrency(editCurrency)
    } catch (error) {
      toast.error('Failed to update account')
    }
  }

  // Reset edit state when dialog opens
  const handleOpenEditDialog = () => {
    if (account) {
      setEditName(account.name)
      setEditBalance(account.balance.toString())
      setEditCurrency(account.currency)
      setEditType(account.type)
      setEditDescription(account.description || '')
      setOriginalCurrency(account.currency)
      setCurrencyConversionMode('keep')
    }
    setIsEditOpen(true)
  }

  // Check if currency has changed
  const currencyChanged = editCurrency !== originalCurrency

  const handleExport = () => {
    // Basic CSV export
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type']
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount,
        t.category_id,
        t.type
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `account-${accountId}-transactions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Export started')
  }

  const handleOpenAdjustDialog = () => {
    setAdjustNewBalance('')
    setAdjustNote('')
    setAdjustDate(new Date().toISOString().slice(0, 10))
    setIsAdjustOpen(true)
  }

  const handleAdjustBalance = async () => {
    if (!account || adjustmentDiff === null) return
    setIsAdjusting(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_balance: parsedNewBalance,
          note: adjustNote.trim() || null,
          adjustment_date: adjustDate || new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error('Failed to adjust balance')
      const data = await res.json()
      if (data.message === 'no_change') {
        toast.info('Balance is already up to date')
      } else {
        toast.success('Balance adjusted successfully')
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user?.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.netWorth(user?.id) })
        queryClient.invalidateQueries({ queryKey: ['balance-adjustments', accountId] })
      }
      setIsAdjustOpen(false)
    } catch {
      toast.error('Failed to adjust balance')
    } finally {
      setIsAdjusting(false)
    }
  }

  if (loading || !account) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const Icon = ACCOUNT_ICONS[account.type] || CreditCard
  const canHaveGoal = ['BANK', 'INVESTMENT'].includes(account.type)

  const accountHeader = (
    <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-3 rounded-xl bg-muted shrink-0">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl leading-title-3 font-bold truncate">{account.name}</h2>
          <p className="text-muted-foreground capitalize">
            {account.type.toLowerCase().replace('_', ' ')}
            {account.is_default && (
              <span className="ml-2 px-2 py-0.5 text-xs leading-caption bg-primary/10 text-primary rounded-full">
                {t('default')}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )

  const content = (
    <>
      <div className={isModal ? "mb-6" : ""}>
        {!isModal ? (
          <TopContent>
            <Button
              variant="ghost"
              size="default"
              onClick={() => router.push('/accounts')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToAccounts')}
            </Button>
            {accountHeader}
          </TopContent>
        ) : (
          <div className="px-1">
             {accountHeader}
          </div>
        )}
      </div>

      <ContentWrapper>
          <MainContent className={isModal ? "w-full max-w-full p-0 overflow-x-hidden" : "w-full"}>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
                <TabsTrigger value="transactions">{t('tabs.transactions')}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/* Goal Section - only for bank and investment accounts */}
                {canHaveGoal && <GoalSection account={account} />}

                {/* Account Info */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg leading-title-5">{t('details.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('details.accountType')}</dt>
                        <dd className="font-medium capitalize">{account.type.toLowerCase().replace('_', ' ')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('details.currency')}</dt>
                        <dd className="font-medium">{account.currency}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('details.initialBalance')}</dt>
                        <dd className="font-medium">{formatCurrency(initialBalance, account.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('details.currentBalance')}</dt>
                        <dd className="font-medium">{formatCurrency(account.currentBalance ?? account.balance, account.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t('details.status')}</dt>
                        <dd className="font-medium">
                          {account.is_active ? (
                            <span className="text-success">{t('details.active')}</span>
                          ) : (
                            <span className="text-muted-foreground">{t('details.inactive')}</span>
                          )}
                        </dd>
                      </div>
                      {account.description && (
                        <div className="pt-3 border-t">
                          <dt className="text-muted-foreground mb-1">{t('details.descriptionLabel')}</dt>
                          <dd className="font-medium">{account.description}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
                {/* Balance History */}
                {adjustments.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg leading-title-5">{t('adjustments.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {adjustments.map((adj) => (
                          <div key={adj.id} className="flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {new Date(adj.adjustment_date).toLocaleDateString()}
                              </span>
                              <span className={`text-sm font-semibold ${adj.adjustment_amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {adj.adjustment_amount >= 0 ? '+' : ''}{formatCurrency(adj.adjustment_amount, account.currency)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(adj.previous_balance, account.currency)} → {formatCurrency(adj.new_balance, account.currency)}
                            </div>
                            {adj.note && <p className="text-xs text-muted-foreground italic">&quot;{adj.note}&quot;</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transactions">
                <Card>
                  <CardContent className="p-0">
                    <TransactionTable 
                      transactions={transactions} 
                      enableSelfManagement={false}
                      enableLazyLoading={true}
                      pageSize={20}
                      showAddButton={false}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <div className="sticky bottom-0 left-0 right-0 z-10 flex gap-3 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
              <Button variant="outline" onClick={handleOpenEditDialog} className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                {t('actions.edit')}
              </Button>
              <Button variant="outline" onClick={handleExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                {t('actions.export')}
              </Button>
              <Button variant="outline" onClick={handleOpenAdjustDialog} className="flex-1">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {t('actions.adjust')}
              </Button>
              <Button variant="destructive" onClick={() => setIsDeleteOpen(true)} className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('actions.delete')}
              </Button>
            </div>
          </MainContent>
          
        </ContentWrapper>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                <Select value={editType} onValueChange={(value) => setEditType(value as typeof editType)}>
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

              {/* Balance */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balance" className="text-right">
                  {t('editDialog.balance')}
                </Label>
                <Input
                  id="balance"
                  type="amount"
                  step="0.01"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="col-span-3"
                />
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
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>{t('editDialog.cancel')}</Button>
              <Button type="submit" onClick={handleUpdate}>{t('editDialog.saveChanges')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust Balance Dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className='border-b mb-2 pb-4'>
              <DialogTitle>{t('adjustDialog.title')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Current balance — read-only */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('adjustDialog.currentBalance')}</Label>
                <div className="col-span-3 font-semibold test-right">
                  {formatCurrency(currentBalance, account.currency)}
                </div>
              </div>
              {/* New balance */}
              <div className="grid grid-cols-4 items-center w-full gap-4">
                <Label htmlFor="adj-balance" className="col-span-1 text-right">{t('adjustDialog.newBalance')}</Label>
                <div className="col-span-3 w-full">
                  <Input
                    id="adj-balance"
                    type="amount"
                    step="0.01"
                    value={adjustNewBalance}
                    onChange={(e) => setAdjustNewBalance(e.target.value)}
                    className="col-span-3 flex w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {/* Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adj-date" className="col-span-1 text-right">{t('adjustDialog.date')}</Label>
                <div className="col-span-3 w-full">
                  <Input
                    id="adj-date"
                    type="date"
                    value={adjustDate}
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="col-span-3 flex w-full"
                  />
                </div>
              </div>
              {/* Note */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="adj-note" className="text-right pt-2">{t('adjustDialog.note')}</Label>
                <textarea
                  id="adj-note"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder={t('adjustDialog.notePlaceholder')}
                  className="col-span-3 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  rows={2}
                />
              </div>
              {/* Live adjustment preview */}
              {adjustmentDiff !== null && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-muted-foreground">{t('adjustDialog.adjustment')}</Label>
                  <div className={`col-span-3 font-semibold ${adjustmentDiff >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {adjustmentDiff >= 0 ? '+' : ''}{formatCurrency(adjustmentDiff, account.currency)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdjustOpen(false)} disabled={isAdjusting}>
                {t('adjustDialog.cancel')}
              </Button>
              <Button
                onClick={handleAdjustBalance}
                disabled={isAdjusting || adjustmentDiff === null || adjustmentDiff === 0}
              >
                {isAdjusting ? t('adjustDialog.adjusting') : t('adjustDialog.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('deleteDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('deleteDialog.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete}>{t('deleteDialog.delete')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  )

  if (isModal) {
    return (
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden p-1">
         {content}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <AccountNavigation />
      <PageLayout>
        {content}
      </PageLayout>
    </div>
  )
}
