'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/organisms/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/molecules/tabs'
import { Plus, Upload, Edit } from 'lucide-react'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { UnifiedStatementProcessor } from '@/components/features/transaction/UnifiedStatementProcessor'
import { Analytics } from '@/lib/analytics/amplitude'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'


interface AddTransactionFormProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function AddTransactionForm({ onSuccess, trigger }: AddTransactionFormProps) {
  const { user } = useAuth()
  const userId = user?.id || ''
  const isMobile = useIsMobile()
  const mutations = useTransactionMutations(userId)
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const [suppressCloseUntil, setSuppressCloseUntil] = useState(0)
  const [activeTab, setActiveTab] = useState('manual')

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
        account_id: data.account_id === '' ? null : data.account_id
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
      <SheetTrigger asChild>
        {trigger || (
          <Button className="gap-2" data-testid="add-transaction-trigger">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'max-h-[95dvh] rounded-t-2xl w-full p-0' : 'w-full grid flex-1 auto-rows-min px-4'}
      >
        <SheetHeader className={isMobile ? 'mx-0 px-4' : undefined}>
          <SheetTitle>Add New Transaction</SheetTitle>
        </SheetHeader>

        <div className={isMobile ? 'w-full px-4 pb-4 pt-4' : 'w-full'}>
          <Tabs defaultValue="manual" className="w-full overflow-y-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload PDF
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="mt-4 my-1">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className='overflow-y-auto no-scrollbar space-y-2 min-h-[70vh]'>
                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">Date</label>
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
                    <label className="text-sm font-medium col-span-2">Description</label>
                    <div className="col-span-5">
                    <Input
                      placeholder="Enter description"
                      {...register('description')}
                      className={errors.description ? 'border-destructive' : ''}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">Amount</label>
                    <div className="col-span-5">
                      <Input
                        type="amount"
                        step="1"
                        placeholder="0.00"
                        {...register('amount', { valueAsNumber: true })}
                        className={errors.amount ? 'border-destructive' : ''}
                      />
                      {errors.amount && (
                        <p className="text-sm text-destructive">{errors.amount.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">Type</label>
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
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE" data-testid="type-option-EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME" data-testid="type-option-INCOME">Income</SelectItem>
                          <SelectItem value="TRANSFER" data-testid="type-option-TRANSFER">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {errors.type && (
                        <p className="text-sm text-destructive">{errors.type.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm col-span-2 font-medium">Category</label>
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
                            ? (categoriesLoading ? 'Loading categories...' : `No categories for ${selectedType?.toLowerCase() || 'this type'}`)
                            : (categoriesLoading ? 'Loading...' : 'Select category')
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
                            {categoriesLoading ? 'Loading categories...' : `No categories available for ${selectedType?.toLowerCase() || 'this type'}`}
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
                        <span className="text-[10px] text-muted-foreground">
                          {categories.length} dev only stat : cats / User: {user?.id?.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">Account</label>
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
                          <SelectValue placeholder={accountsLoading ? 'Loading...' : 'Select account'} />
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
                              No accounts available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.account_id && (
                        <p className="text-sm text-destructive">{errors.account_id.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 grid grid-cols-7 items-center">
                    <label className="text-sm font-medium col-span-2">Merchant (Opt)</label>
                    <div className='col-span-5'>
                      <Input
                        placeholder="Enter merchant name"
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
                        Recurring Transaction
                      </label>
                    </div>
                    
                    {isRecurring && (
                      <div className="space-y-4 pl-6 border-l-2 border-primary/20 ml-1">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Frequency</label>
                          <Select
                              value={watch('recurring_frequency') || 'monthly'}
                              onValueChange={(value) => {
                                setSuppressCloseUntil(Date.now() + 500)
                                setValue('recurring_frequency', value as 'daily' | 'weekly' | 'monthly' | 'yearly')
                              }}
                              onOpenChange={setIsAnySelectOpen}
                            >
                              <SelectTrigger data-testid="frequency-select-trigger">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Period</label>
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
                                Continuous (No end date)
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
                                End Date
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
                </div>
                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      Analytics.track('Add Transaction Cancelled', {
                        trigger: 'cancel_button'
                      })
                      setOpen(false)
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </SheetFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4 my-1">
                <UnifiedStatementProcessor 
                  onSuccess={() => {
                    onSuccess?.()
                    setOpen(false)
                  }}
                  onCancel={() => setOpen(false)}
                />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
