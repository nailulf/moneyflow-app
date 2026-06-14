'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/organisms/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import { Plus, Upload, Edit, Loader2 } from 'lucide-react'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { UnifiedStatementProcessor } from '@/components/features/transaction/UnifiedStatementProcessor'
import { Analytics } from '@/lib/analytics/amplitude'
import { SUPPORTED_CURRENCIES } from '@/lib/exchange-rate'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'


interface AddTransactionFormProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
  // Optional controlled-open mode. When `open` is provided the parent owns the
  // open state (e.g. onboarding completion prompting a first transaction).
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddTransactionForm({ onSuccess, trigger, open: controlledOpen, onOpenChange }: AddTransactionFormProps) {
  const t = useTranslations('transactions.form')
  const { user } = useAuth()
  const userId = user?.id || ''
  const isMobile = useIsMobile()
  const mutations = useTransactionMutations(userId)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const [suppressCloseUntil, setSuppressCloseUntil] = useState(0)
  const [activeTab, setActiveTab] = useState('manual')
  const uploadTriggerRef = useRef<(() => void) | null>(null)
  const [isUploadProcessing, setIsUploadProcessing] = useState(false)

  // Load user categories from shared context
  const { categories, loading: categoriesLoading, error: categoriesError, refreshCategories } = useCategories()

  // Debug logging & Auto-refresh
  useEffect(() => {
    if (categoriesError) {
      console.error('Category loading error:', categoriesError)
    }
    console.log('Loaded categories:', categories.length, categories)
    
    // Attempt to refresh if empty and no error
    if (categories.length === 0 && !categoriesLoading && !categoriesError) {
      console.log('Categories empty, refreshing...')
      refreshCategories()
    }
  }, [categories, categoriesError, categoriesLoading, refreshCategories])
  
  // Load user accounts from shared context
  const { accounts, loading: accountsLoading } = useAccounts()
  
  // Group categories by type for display
  const categoryGroups = categories.reduce((groups, category) => {
    const groupType = (category.group_type || 'EXPENSE').toUpperCase()
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

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split('T')[0])
  }, [])

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
      date: currentDate,
      description: '',
      amount: 0,
      type: 'EXPENSE',
      category_id: '',
      account_id: '',
      to_account_id: null,
      merchant: '',
      currency: 'IDR',
      is_recurring: false,
      recurring_frequency: 'monthly',
      recurring_end_date: null
    }
  })

  useEffect(() => {
    if (currentDate) {
      setValue('date', currentDate)
    }
  }, [currentDate, setValue])

  const selectedType = watch('type')
  const selectedCategoryId = watch('category_id')
  const isRecurring = watch('is_recurring')
  const selectedAccountId = watch('account_id')

  // Sync currency from selected account
  useEffect(() => {
    if (selectedAccountId) {
      const account = accounts.find(a => a.id === selectedAccountId)
      if (account?.currency) {
        setValue('currency', account.currency)
      }
    }
  }, [selectedAccountId, accounts, setValue])

  // Reset category when type changes
  useEffect(() => {
    setValue('category_id', '')
    // Clear any existing category validation errors when type changes
    if (errors.category_id) {
      // Force re-validation to clear the error
      setTimeout(() => {
        setValue('category_id', '', { shouldValidate: true })
      }, 100)
    }
  }, [selectedType, setValue, errors.category_id])

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true)

    // Track form submission attempt
    Analytics.track('Add Transaction Submitted', {
      transaction_type: data.type,
      has_category: !!data.category_id,
      has_account: !!data.account_id,
      has_merchant: !!data.merchant,
      is_recurring: data.is_recurring,
      recurring_frequency: data.is_recurring ? data.recurring_frequency : null
    })

    try {
      // Transform empty account_id to null to match database schema
      const transformedData = {
        ...data,
        account_id: data.account_id === '' ? null : data.account_id,
        to_account_id: data.type === 'TRANSFER' ? (data.to_account_id || null) : null,
      }

      // Use the mutations hook — this calls the API and automatically invalidates
      // the React Query cache so the transaction list refreshes without a manual refetch.
      await mutations.create({
        ...transformedData,
        amount: Number(transformedData.amount),
        user_id: userId,
        date: new Date(transformedData.date).toISOString(),
      })

      onSuccess?.()
      setOpen(false)

      // Reset form to default values
      reset({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: 'EXPENSE',
        category_id: '',
        account_id: '',
        to_account_id: null,
        merchant: '',
        currency: 'IDR',
        is_recurring: false,
        recurring_frequency: 'monthly',
        recurring_end_date: null
      })
    } catch (error) {
      console.error('Error creating transaction:', error)

      // Track failed creation (toast is already shown by the mutation's onError)
      Analytics.track('Transaction Creation Failed', {
        transaction_type: data.type,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derive categories based on selected type
  const groupForType = categoryGroups.find(g => g.type === (selectedType || 'EXPENSE'))
  const dynamicCategoryItems = groupForType?.categories ?? []
  const hasDynamicCategories = dynamicCategoryItems.length > 0


  return (
    <Sheet
      open={open}
      onOpenChange={(next: boolean) => {
        const suppressed = suppressCloseUntil > Date.now()
        if (!next && (isAnySelectOpen || suppressed)) return
        setOpen(next)
        // Track form opened/closed
        if (next) {
          Analytics.track('Add Transaction Form Opened', {
            trigger: 'button_click'
          })
        }
      }}
    >
      {/* In controlled-open mode (parent owns the open state) we skip the
          trigger entirely so there's no orphan button rendered next to the
          parent's own CTA. Uncontrolled callers still get the default trigger. */}
      {!isControlled && (
        <SheetTrigger asChild>
          {trigger || (
            <Button className="gap-2" data-testid="add-transaction-trigger">
              <Plus className="h-4 w-4" />
              {t('addTrigger')}
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'rounded-t-2xl overflow-hidden' : 'w-full sm:max-w-md'}
      >
        <SheetHeader>
          <SheetTitle>{t('addTitle')}</SheetTitle>
        </SheetHeader>

        {/* Single scrollable area — no flex chains through Radix internals */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                {t('manualEntry')}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {t('uploadPdf')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4">
              <form id="add-transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-2 pb-4">
                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">{t('date')}</label>
                    <div className='col-span-5'>
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
                        <SelectTrigger className="w-[90px] shrink-0" data-testid="currency-select-trigger">
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
                          step="1"
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
                        <SelectTrigger
                        className={cn(
                          "w-full",
                          errors.type ? 'border-destructive' : '')} data-testid="type-select-trigger">
                          <SelectValue placeholder={t('selectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE" data-testid="type-option-EXPENSE">{t('typeExpense')}</SelectItem>
                          <SelectItem value="INCOME" data-testid="type-option-INCOME">{t('typeIncome')}</SelectItem>
                          <SelectItem value="TRANSFER" data-testid="type-option-TRANSFER">{t('typeTransfer')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {errors.type && (
                        <p className="text-sm text-destructive">{errors.type.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm col-span-2 font-medium">{t('category')}</label>
                    <div className='col-span-5'>
                    <Select
                      value={(selectedCategoryId as string) || undefined}
                      onValueChange={(value) => {
                        setSuppressCloseUntil(Date.now() + 500)
                        setValue('category_id', value)
                      }}
                      disabled={categoriesLoading || !hasDynamicCategories}
                      onOpenChange={setIsAnySelectOpen}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full",
                          errors.category_id ? "border-destructive" : undefined
                        )}
                        data-testid="category-select-trigger"
                      >
                        <SelectValue placeholder={
                          !hasDynamicCategories
                            ? (categoriesLoading ? t('categoryLoading') : t('noCategoriesForType'))
                            : (categoriesLoading ? t('loadingShort') : t('selectCategory'))
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {hasDynamicCategories ? (
                          dynamicCategoryItems.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} data-testid={`category-option-${cat.id}`}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.color || 'hsl(var(--muted-foreground))' }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {categoriesLoading ? t('categoryLoading') : t('noCategoriesAvailable')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.category_id && (
                      <p className="text-sm text-destructive">{errors.category_id.message}</p>
                    )}
                    <div className="flex justify-between items-center">
                      {categoriesError && (
                        <p className="text-xs text-destructive mb-1">Error: {categoriesError}</p>
                      )}
                      {process.env.NODE_ENV === 'development' && (
                        <span className="text-nano text-muted-foreground">
                          {categories.length} dev only stat : cats / User: {user?.id?.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">{t('account')}</label>
                    <div className='col-span-5'>
                      <Select
                        value={watch('account_id') || undefined}
                        onValueChange={(value) => {
                          setSuppressCloseUntil(Date.now() + 500)
                          setValue('account_id', value)
                        }}
                        disabled={accountsLoading}
                        onOpenChange={setIsAnySelectOpen}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          errors.account_id ? 'border-destructive' : '')} data-testid="account-select-trigger">
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
                    <div className='col-span-5'>
                      <Select
                        value={watch('to_account_id') || undefined}
                        onValueChange={(value) => {
                          setSuppressCloseUntil(Date.now() + 500)
                          setValue('to_account_id', value)
                        }}
                        disabled={accountsLoading}
                        onOpenChange={setIsAnySelectOpen}
                      >
                        <SelectTrigger className={cn(
                          "w-full",
                          errors.to_account_id ? 'border-destructive' : '')} data-testid="to-account-select-trigger">
                          <SelectValue placeholder={accountsLoading ? t('loadingShort') : t('selectToAccount')} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.filter(a => a.id !== selectedAccountId).length > 0 ? (
                            accounts
                              .filter(a => a.id !== selectedAccountId)
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id} data-testid={`to-account-option-${account.id}`}>
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
                    <div className='col-span-5'>
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
                    
                    {isRecurring && (
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
                              <SelectTrigger data-testid="frequency-select-trigger">
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
                                min={currentDate}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
              </form>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <UnifiedStatementProcessor
                onSuccess={() => {
                  onSuccess?.()
                  setOpen(false)
                }}
                onCancel={() => setOpen(false)}
                uploadTriggerRef={uploadTriggerRef}
                onUploadingChange={setIsUploadProcessing}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Single footer anchored directly to SheetContent's flex column */}
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              Analytics.track(
                activeTab === 'manual' ? 'Add Transaction Cancelled' : 'Statement Upload Cancelled',
                { trigger: 'cancel_button' }
              )
              setOpen(false)
            }}
          >
            {t('cancel')}
          </Button>
          {activeTab === 'manual' ? (
            <Button
              type="submit"
              form="add-transaction-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('adding') : t('addButton')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => uploadTriggerRef.current?.()}
              disabled={isUploadProcessing}
            >
              {isUploadProcessing
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Upload className="mr-2 h-4 w-4" />}
              {t('uploadProcess')}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
