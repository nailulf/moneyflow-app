'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validations'
import { Transaction } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCategories } from '@/contexts/CategoryContext'

interface EditTransactionFormProps {
  userId: string
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
      merchant: ''
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
      setValue('merchant', transaction.merchant || '')
    }
  }, [transaction, open, setValue])

  const selectedType = watch('type')
  const selectedCategoryId = watch('category_id')

  const onSubmit = async (data: TransactionFormData) => {
    if (!transaction) return
    
    setIsSubmitting(true)
    try {
      if (onTransactionUpdated) {
        await onTransactionUpdated(transaction.id, data)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => {
          const suppressed = suppressCloseUntil > Date.now()
          if (isAnySelectOpen || suppressed) {
            event.preventDefault()
            return
          }
          const target = event.target as HTMLElement | null
          if (
            target && (
              target.closest('[data-slot^="select-"]') ||
              target.closest('[role="listbox"]') ||
              target.closest('[role="option"]')
            )
          ) {
            event.preventDefault()
          }
        }}
        onPointerDownOutside={(event: Event & { preventDefault: () => void; detail?: { originalEvent?: Event }; target?: EventTarget | null }) => {
          const suppressed = suppressCloseUntil > Date.now()
          if (isAnySelectOpen || suppressed) {
            event.preventDefault()
            return
          }
          const orig = event.detail?.originalEvent as Event | undefined
          const target = (orig?.target ?? event.target) as HTMLElement | null
          if (
            target && (
              target.closest('[data-slot^="select-"]') ||
              target.closest('[role="listbox"]') ||
              target.closest('[role="option"]')
            )
          ) {
            event.preventDefault()
          }
        }}
        onFocusOutside={(event: Event & { preventDefault: () => void; detail?: { originalEvent?: Event }; target?: EventTarget | null }) => {
          const suppressed = suppressCloseUntil > Date.now()
          if (isAnySelectOpen || suppressed) {
            event.preventDefault()
            return
          }
          const orig = event.detail?.originalEvent as Event | undefined
          const target = (orig?.target ?? event.target) as HTMLElement | null
          if (
            target && (
              target.closest('[data-slot^="select-"]') ||
              target.closest('[role="listbox"]') ||
              target.closest('[role="option"]')
            )
          ) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
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
            <label className="text-sm font-medium">Merchant (Optional)</label>
            <Input
              placeholder="Enter merchant name"
              {...register('merchant')}
            />
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
      </DialogContent>
    </Dialog>
  )
}