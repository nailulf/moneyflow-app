'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AccountNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Wallet, TrendingUp, Building2, Loader2, Edit, Trash2, Download } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { formatCurrency } from '@/lib/data-utils'
import { GoalSection } from '@/components/goals'
import { AccountDB } from '@/types/database'
import { useAllTransactions } from '@/hooks/useTransactionsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransactionTable } from '@/components/TransactionTable'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
]

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'INVESTMENT', label: 'Investment' },
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

  const { user } = useAuth()
  const { accounts, loading, deleteAccount, updateAccount } = useAccounts()
  const [account, setAccount] = useState<AccountDB | null>(null)
  
  // State for actions
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBalance, setEditBalance] = useState<string>('')
  const [editCurrency, setEditCurrency] = useState('')
  const [editType, setEditType] = useState<'BANK' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER'>('BANK')
  const [editDescription, setEditDescription] = useState('')
  const [currencyConversionMode, setCurrencyConversionMode] = useState<'keep' | 'convert'>('keep')
  const [originalCurrency, setOriginalCurrency] = useState('')

  // Transactions
  const { transactions, isLoading: transactionsLoading } = useAllTransactions({
    userId: user?.id || '',
    accountId: accountId,
    enabled: !!user?.id && !!accountId
  })

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
      const balanceValue = parseFloat(editBalance)
      if (isNaN(balanceValue)) {
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

  if (loading || !account) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const Icon = ACCOUNT_ICONS[account.type] || CreditCard
  const canHaveGoal = ['BANK', 'INVESTMENT'].includes(account.type)

  const AccountHeader = () => (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-muted">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl leading-title-3 font-bold">{account.name}</h2>
          <p className="text-muted-foreground capitalize">
            {account.type.toLowerCase().replace('_', ' ')}
            {account.is_default && (
              <span className="ml-2 px-2 py-0.5 text-xs leading-caption bg-primary/10 text-primary rounded-full">
                Default
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={handleOpenEditDialog} title="Edit Account">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleExport} title="Export Transactions">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => setIsDeleteOpen(true)} title="Delete Account">
          <Trash2 className="w-4 h-4" />
        </Button>
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
              Back to Accounts
            </Button>
            <AccountHeader />
          </TopContent>
        ) : (
          <div className="px-1">
             <AccountHeader />
          </div>
        )}
      </div>

      <ContentWrapper>
          <MainContent className={isModal ? "sm:w-[50vw] sm:max-w-[90vw] p-0" : ""}>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/* Goal Section - only for bank and investment accounts */}
                {canHaveGoal && <GoalSection account={account} />}

                {/* Account Info */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg leading-title-5">Account Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Account Type</dt>
                        <dd className="font-medium capitalize">{account.type.toLowerCase().replace('_', ' ')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Currency</dt>
                        <dd className="font-medium">{account.currency}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Current Balance</dt>
                        <dd className="font-medium">{formatCurrency(account.balance, account.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="font-medium">
                          {account.is_active ? (
                            <span className="text-success">Active</span>
                          ) : (
                            <span className="text-muted-foreground">Inactive</span>
                          )}
                        </dd>
                      </div>
                      {account.description && (
                        <div className="pt-3 border-t">
                          <dt className="text-muted-foreground mb-1">Description</dt>
                          <dd className="font-medium">{account.description}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions">
                <Card>
                  <CardContent className="p-0">
                    <TransactionTable 
                      transactions={transactions} 
                      enableSelfManagement={false}
                      enableLazyLoading={true}
                      pageSize={20}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </MainContent>
        </ContentWrapper>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Make changes to your account details here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Account Name */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
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
                  Type
                </Label>
                <Select value={editType} onValueChange={(value) => setEditType(value as typeof editType)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select account type" />
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
                  Balance
                </Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="col-span-3"
                />
              </div>

              {/* Currency */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  Currency
                </Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger className="col-span-3">
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

              {/* Currency Conversion Option - only show when currency changes */}
              {currencyChanged && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Amount
                  </Label>
                  <div className="col-span-3 space-y-3">
                    <p className="text-sm leading-body-sm text-muted-foreground">
                      Currency changed from {originalCurrency} to {editCurrency}. How would you like to handle the balance?
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
                          Keep the same numeric value ({editBalance} {editCurrency})
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border text-left opacity-50 cursor-not-allowed"
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                        <span className="text-sm leading-body-sm text-muted-foreground">
                          Convert amount (coming soon)
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleUpdate}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  )

  if (isModal) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-1">
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
