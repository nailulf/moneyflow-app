'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Upload, Edit } from 'lucide-react'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'
import { PDFStatementUpload } from '@/components/PDFStatementUpload'


interface AddTransactionFormProps {
  userId: string
  onSuccess?: () => void
}

export function AddTransactionForm({ userId, onSuccess }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const [suppressCloseUntil, setSuppressCloseUntil] = useState(0)
  const [activeTab, setActiveTab] = useState('manual')

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

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split('T')[0])
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
    try {
      // Transform empty account_id to null to match database schema
      const transformedData = {
        ...data,
        account_id: data.account_id === '' ? null : data.account_id
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transformedData,
          amount: Number(transformedData.amount),
          user_id: '1d16c616-77a6-48de-9a54-dde7845f720d',
          date: new Date(transformedData.date).toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      onSuccess?.()
      setOpen(false)
    } catch (error) {
      console.error('Error creating transaction:', error)
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
      }}
    >
      <SheetTrigger asChild>
        <Button className="gap-2" data-testid="add-transaction-trigger">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New Transaction</SheetTitle>
        </SheetHeader>
        
        <div className="w-full">
          <Tabs defaultValue="manual" className="w-full">
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
            
            <TabsContent value="manual" className="mt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              {...register('date')}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Enter description"
              {...register('description')}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Use positive numbers for income, negative for expenses
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={selectedType}
              onValueChange={(value: string) => {
                setSuppressCloseUntil(Date.now() + 500)
                setValue('type', value as 'INCOME' | 'EXPENSE' | 'TRANSFER')
              }}
              onOpenChange={setIsAnySelectOpen}
            >
              <SelectTrigger className={errors.type ? 'border-red-500' : ''} data-testid="type-select-trigger">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE" data-testid="type-option-EXPENSE">Expense</SelectItem>
                <SelectItem value="INCOME" data-testid="type-option-INCOME">Income</SelectItem>
                <SelectItem value="TRANSFER" data-testid="type-option-TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={(selectedCategoryId as string) || undefined}
              onValueChange={(value) => {
                setSuppressCloseUntil(Date.now() + 500)
                setValue('category_id', value)
              }}
              disabled={categoriesLoading || !hasDynamicCategories}
              onOpenChange={setIsAnySelectOpen}
            >
              <SelectTrigger className={errors.category_id ? 'border-red-500' : ''} data-testid="category-select-trigger">
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
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    {categoriesLoading ? 'Loading categories...' : `No categories available for ${selectedType?.toLowerCase() || 'this type'}`}
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-red-500">{errors.category_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account</label>
            <Select
              value={watch('account_id') || undefined}
              onValueChange={(value) => {
                setSuppressCloseUntil(Date.now() + 500)
                setValue('account_id', value)
              }}
              disabled={accountsLoading}
              onOpenChange={setIsAnySelectOpen}
            >
              <SelectTrigger className={errors.account_id ? 'border-red-500' : ''} data-testid="account-select-trigger">
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
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No accounts available
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-sm text-red-500">{errors.account_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Merchant (Optional)</label>
            <Input
              placeholder="Enter merchant name"
              {...register('merchant')}
            />
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_recurring"
                {...register('is_recurring')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_recurring" className="text-sm font-medium">
                Recurring Transaction
              </label>
            </div>
            
            {isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200 ml-1">
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
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                        checked={!watch('recurring_end_date')}
                        onChange={() => setValue('recurring_end_date', null)}
                      />
                      <label htmlFor="period_continuous" className="text-sm text-gray-700">
                        Continuous (No end date)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="period_ended"
                        name="period_type"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
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
                      <label htmlFor="period_ended" className="text-sm text-gray-700">
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

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
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
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <PDFStatementUpload 
                onSuccess={() => {
                  onSuccess?.()
                  setOpen(false)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}