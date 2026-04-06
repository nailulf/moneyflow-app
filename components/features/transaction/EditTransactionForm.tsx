'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Transaction } from '@/types/database'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/organisms/sheet'
import { toast } from 'sonner'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface EditTransactionFormProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionUpdated?: (id: string, data: Partial<TransactionFormData>) => void
  onSuccess?: () => void
}

export function EditTransactionForm({ 
  transaction, 
  open, 
  onOpenChange, 
  onTransactionUpdated,
  onSuccess
}: EditTransactionFormProps) {
  const t = useTranslations('transactions.form')
  const isMobile = useIsMobile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const [suppressCloseUntil, setSuppressCloseUntil] = useState(0)
  // Load user categories from shared context
  const { categories, loading: categoriesLoading } = useCategories()
  
  // Load user accounts from shared context
  const { accounts, loading: accountsLoading } = useAccounts()
  
  // Group categories by type for display
  const categoryGroups = categories.reduce((groups, category) => {
    const groupType = category.group_type || 'EXPENSE'
    const existingGroup = groups.find(g => g.type === groupType)
    if (existingGroup) {
      existingGroup.categories.push(category)
    } else {
      groups.push({
        type: groupType,
        categories: [category]
      })
    }
    return groups
  }, [] as Array<{ type: string; categories: typeof categories }>)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: '',
      description: '',
      amount: 0,
      type: 'EXPENSE',
      category_id:'',
      account_id: '',
      to_account_id: null,
      merchant: '',
      currency: 'IDR',
      is_recurring: false,
      recurring_frequency: 'monthly',
      recurring_end_date: null
    }
  })

  // Reset form when transaction changes
  useEffect(() => {
    if (transaction && open) {
      reset({
        date: transaction.date.split('T')[0],
        description: transaction.description || '',
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id,
        account_id: transaction.account_id || '',
        to_account_id: transaction.to_account_id || null,
        merchant: transaction.merchant || '',
        currency: transaction.currency || 'IDR',
        is_recurring: transaction.is_recurring || false,
        recurring_frequency: transaction.recurring_frequency || 'monthly',
        recurring_end_date: transaction.recurring_end_date ? transaction.recurring_end_date.split('T')[0] : null
      })

      // Track form opened
      Analytics.track('Edit Transaction Form Opened', {
        transaction_id: transaction.id,
        transaction_type: transaction.type
      })
    }
  }, [transaction, open, reset])

  const selectedType = watch('type')
  const selectedCategoryId = watch('category_id')
  const selectedAccountId = watch('account_id')

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction) return

    // Determine which fields changed
    const changedFields: string[] = []
    if (transaction.description !== data.description) changedFields.push('description')
    if (transaction.amount !== data.amount) changedFields.push('amount')
    if (transaction.type !== data.type) changedFields.push('type')
    if (transaction.category_id !== data.category_id) changedFields.push('category')
    if (transaction.account_id !== (data.account_id || null)) changedFields.push('account')
    if (transaction.merchant !== data.merchant) changedFields.push('merchant')
    if (transaction.is_recurring !== data.is_recurring) changedFields.push('recurring')

    // Track form submission
    Analytics.track('Edit Transaction Submitted', {
      transaction_id: transaction.id,
      fields_changed: changedFields,
      changed_type: transaction.type !== data.type,
      changed_category: transaction.category_id !== data.category_id
    })

    setIsSubmitting(true)
    try {
      if (onTransactionUpdated) {
        // Transform empty account_id to null to match database schema
        const transformedData = {
          ...data,
          account_id: data.account_id === '' ? null : data.account_id,
          to_account_id: data.type === 'TRANSFER' ? (data.to_account_id || null) : null,
        }
        await onTransactionUpdated(transaction.id, transformedData)
      }

      // Track successful update
      Analytics.track('Transaction Updated', {
        transaction_id: transaction.id,
        fields_changed: changedFields,
        new_type: data.type,
        new_category_id: data.category_id
      })

      // Toast is handled by the mutation layer (useTransactionsQuery / use-transaction-manager)
      onSuccess?.()
      onOpenChange(false)
      reset() // Clear form state after successful update
    } catch (error) {
      // Track failed update
      Analytics.track('Transaction Update Failed', {
        transaction_id: transaction.id,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      // Toast is handled by the mutation layer
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get categories for the selected type
  const getAvailableCategories = () => {
    if (categoriesLoading || !categoryGroups) return []
    
    const group = categoryGroups.find(g => g.type === selectedType)
    return group?.categories || []
  }

  const availableCategories = getAvailableCategories()

  // Function to render category with color indicator
  const renderCategoryWithColor = (category: { name: string; color?: string }) => (
    <div className="flex items-center gap-2">
      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: category.color || 'hsl(var(--muted-foreground))' }}
                      />
      <span>{category.name}</span>
    </div>
  )

  // Get selected category for display
  const getSelectedCategory = () => {
    if (!selectedCategoryId) return null
    return availableCategories.find(cat => cat.id === selectedCategoryId)
  }

  const selectedCategory = getSelectedCategory()

  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        const suppressed = suppressCloseUntil > Date.now()
        if (!next && (isAnySelectOpen || suppressed)) return
        onOpenChange(next)
      }}
    >
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'rounded-t-2xl overflow-hidden' : 'w-full sm:max-w-md'}
      >
        <SheetHeader>
          <SheetTitle>{t('editTitle')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={isMobile ? 'flex flex-col flex-1 min-h-0 px-4 pt-4' : 'flex flex-col flex-1 min-h-0'}>
          <div className="overflow-y-auto no-scrollbar space-y-2 flex-1 min-h-0">
          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('date')}</label>
            <div className="col-span-5">
              <Input
                type="date"
                {...register('date')}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('description')}</label>
            <div className="col-span-5">
              <Input
                placeholder={t('descriptionPlaceholder')}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('amount')}</label>
            <div className="col-span-5 flex gap-2">
              <Select
                value={watch('currency') || 'IDR'}
                onValueChange={(value) => {
                  setSuppressCloseUntil(Date.now() + 500)
                  setValue('currency', value)
                }}
                onOpenChange={setIsAnySelectOpen}
              >
                <SelectTrigger className="w-[90px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <Input
                  type="amount"
                  step="0.01"
                  placeholder="0"
                  currency={watch('currency') || 'IDR'}
                  {...register('amount', { valueAsNumber: true })}
                  className={errors.amount ? 'border-destructive' : ''}
                />
              </div>
            </div>
            {errors.amount && (
              <div className="col-span-2" />
            )}
            {errors.amount && (
              <p className="text-sm text-destructive col-span-5">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('type')}</label>
            <div className="col-span-5">
              <Select
                value={selectedType}
                onValueChange={(value: string) => {
                  setSuppressCloseUntil(Date.now() + 500)
                  setValue('type', value as 'INCOME' | 'EXPENSE' | 'TRANSFER')
                }}
                onOpenChange={setIsAnySelectOpen}
              >
                <SelectTrigger className={cn("w-full", errors.type ? 'border-destructive' : '')}>
                  <SelectValue placeholder={t('selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">{t('typeExpense')}</SelectItem>
                  <SelectItem value="INCOME">{t('typeIncome')}</SelectItem>
                  <SelectItem value="TRANSFER">{t('typeTransfer')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('category')}</label>
            <div className="col-span-5">
              <Select
                value={selectedCategoryId || ''}
                onValueChange={(value: string) => {
                  setSuppressCloseUntil(Date.now() + 500)
                  setValue('category_id', value)
                }}
                onOpenChange={setIsAnySelectOpen}
              >
                <SelectTrigger className={cn("w-full", errors.category_id ? 'border-destructive' : '')}>
                  <SelectValue placeholder={t('selectCategory')}>
                    {selectedCategory ? renderCategoryWithColor(selectedCategory) : t('selectCategory')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.length > 0 ? (
                    availableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {renderCategoryWithColor(category)}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {t('noCategoriesAvailable')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('account')}</label>
            <div className="col-span-5">
              <Select
                value={watch('account_id') || undefined}
                onValueChange={(value) => {
                  setSuppressCloseUntil(Date.now() + 500)
                  setValue('account_id', value)
                }}
                disabled={accountsLoading}
                onOpenChange={setIsAnySelectOpen}
              >
                <SelectTrigger className={cn("w-full", errors.account_id ? 'border-destructive' : '')} data-testid="account-select-trigger">
                  <SelectValue placeholder={accountsLoading ? t('loadingShort') : t('selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length > 0 ? (
                    accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id} data-testid={`account-option-${account.id}`}>
                        {account.name} ({account.type.toLowerCase().replace('_', ' ')})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t('noAccountsAvailable')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.account_id && (
                <p className="text-sm text-destructive">{errors.account_id.message}</p>
              )}
            </div>
          </div>

          {selectedType === 'TRANSFER' && (
          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('toAccount')}</label>
            <div className="col-span-5">
              <Select
                value={watch('to_account_id') || undefined}
                onValueChange={(value) => {
                  setSuppressCloseUntil(Date.now() + 500)
                  setValue('to_account_id', value)
                }}
                disabled={accountsLoading}
                onOpenChange={setIsAnySelectOpen}
              >
                <SelectTrigger className={cn("w-full", errors.to_account_id ? 'border-destructive' : '')}>
                  <SelectValue placeholder={accountsLoading ? t('loadingShort') : t('selectToAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== selectedAccountId).length > 0 ? (
                    accounts
                      .filter(a => a.id !== selectedAccountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type.toLowerCase().replace('_', ' ')})
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t('noAccountsAvailable')}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.to_account_id && (
                <p className="text-sm text-destructive">{errors.to_account_id.message}</p>
              )}
            </div>
          </div>
          )}


          <div className="space-y-2 grid grid-cols-7 items-center">
            <label className="text-sm font-medium col-span-2">{t('merchantOpt')}</label>
            <div className="col-span-5">
              <Input
                placeholder={t('merchantPlaceholder')}
                {...register('merchant')}
              />
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_recurring"
                {...register('is_recurring')}
                className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
              />
              <label htmlFor="is_recurring" className="text-sm font-medium">
                {t('recurringTransaction')}
              </label>
            </div>
            
            {watch('is_recurring') && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20 ml-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('frequency')}</label>
                  <Select
                    value={watch('recurring_frequency') || 'monthly'}
                    onValueChange={(value) => {
                      setSuppressCloseUntil(Date.now() + 500)
                      setValue('recurring_frequency', value as 'daily' | 'weekly' | 'monthly' | 'yearly')
                    }}
                    onOpenChange={setIsAnySelectOpen}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectFrequency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t('daily')}</SelectItem>
                      <SelectItem value="weekly">{t('weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('period')}</label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="period_continuous"
                        name="period_type"
                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded-full"
                        checked={!watch('recurring_end_date')}
                        onChange={() => setValue('recurring_end_date', null)}
                      />
                      <label htmlFor="period_continuous" className="text-sm text-muted-foreground">
                        {t('continuous')}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="period_ended"
                        name="period_type"
                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded-full"
                        checked={!!watch('recurring_end_date')}
                        onChange={() => {
                          // Set default end date to one year from now if not set
                          if (!watch('recurring_end_date')) {
                            const nextYear = new Date()
                            nextYear.setFullYear(nextYear.getFullYear() + 1)
                            setValue('recurring_end_date', nextYear.toISOString().split('T')[0])
                          }
                        }}
                      />
                      <label htmlFor="period_ended" className="text-sm text-muted-foreground">
                        {t('endDate')}
                      </label>
                    </div>
                  </div>
                  
                  {!!watch('recurring_end_date') && (
                    <div className="mt-2">
                      <Input
                        type="date"
                        {...register('recurring_end_date')}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                Analytics.track('Edit Transaction Cancelled', {
                  transaction_id: transaction?.id,
                  transaction_type: transaction?.type
                })
                onOpenChange(false)
              }}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? t('updating') : t('updateButton')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
