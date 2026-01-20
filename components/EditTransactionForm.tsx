'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Transaction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'

interface EditTransactionFormProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionUpdated?: (id: string, data: Partial<TransactionFormData>) => void
}

export function EditTransactionForm({ 
  transaction, 
  open, 
  onOpenChange, 
  onTransactionUpdated 
}: EditTransactionFormProps) {
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
      setValue('date', transaction.date.split('T')[0]) // Convert to YYYY-MM-DD format
      setValue('description', transaction.description || '')
      setValue('amount', transaction.amount)
      setValue('type', transaction.type)
      setValue('category_id', transaction.category_id)
      setValue('account_id', transaction.account_id || '')
      setValue('merchant', transaction.merchant || '')
      setValue('is_recurring', transaction.is_recurring || false)
      setValue('recurring_frequency', transaction.recurring_frequency || 'monthly')
      setValue('recurring_end_date', transaction.recurring_end_date ? transaction.recurring_end_date.split('T')[0] : null)
    }
  }, [transaction, open, setValue])

  const selectedType = watch('type')
  const selectedCategoryId = watch('category_id')

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction) return
    
    setIsSubmitting(true)
    try {
      if (onTransactionUpdated) {
        // Transform empty account_id to null to match database schema
        const transformedData = {
          ...data,
          account_id: data.account_id === '' ? null : data.account_id
        }
        await onTransactionUpdated(transaction.id, transformedData)
      }
      toast.success('Transaction updated successfully!')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update transaction')
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
        style={{ backgroundColor: category.color || '#6B7280' }}
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Transaction</SheetTitle>
        </SheetHeader>
        <div className="mt-6 overflow-y-auto">
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
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={selectedCategoryId || ''}
              onValueChange={(value: string) => {
                setSuppressCloseUntil(Date.now() + 500)
                setValue('category_id', value)
              }}
              onOpenChange={setIsAnySelectOpen}
            >
              <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category">
                  {selectedCategory ? renderCategoryWithColor(selectedCategory) : "Select category"}
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
                  <div className="px-2 py-1 text-sm text-gray-500">
                    No categories available for this type
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
            
            {watch('is_recurring') && (
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
                    <SelectTrigger>
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
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Updating...' : 'Update Transaction'}
            </Button>
          </div>
        </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}