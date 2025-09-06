'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/data-utils'
import { useCategories } from '@/contexts/CategoryContext'
import { useBudgets } from '@/contexts/BudgetContext'
import { toast } from 'sonner'
import { CATEGORIES, CATEGORY_COLORS } from '@/types/app'
import { useBudgetAllocation } from '@/hooks/useBudgetAllocation'
import { fromExistingBudgetData, toDatabase } from '@/lib/budget-allocation'

interface BudgetCategory {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  color: string
  status: 'good' | 'warning' | 'over'
}

interface BudgetEditData {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategory[]
}

interface BudgetEditSheetProps {
  isOpen: boolean
  onClose: () => void
  budgetData: BudgetEditData | null
  onSave: (updatedBudget: BudgetEditData) => Promise<void>
}

export function BudgetEditSheet({ isOpen, onClose, budgetData, onSave }: BudgetEditSheetProps) {
  const [editForm, setEditForm] = useState<BudgetEditData>({
    id: '',
    name: '',
    totalAmount: 0,
    period: 'monthly',
    categories: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { categories } = useCategories()
  
  // Initialize budget allocation hook with minimum value to prevent zero error
  const budgetAllocation = useBudgetAllocation(1, 'USD')

  // Sync form categories with allocation hook's completeAllocation in real-time
  useEffect(() => {
    if (budgetAllocation.completeAllocation.length > 0) {
      setEditForm(prev => ({
        ...prev,
        categories: budgetAllocation.completeAllocation.map(cat => ({
          id: cat.category_id,
          category: cat.category_name,
          budgetAmount: cat.allocated_amount,
          spentAmount: cat.spent_amount || 0,
          color: cat.category_color,
          status: 'good' as const
        }))
      }))
    }
  }, [budgetAllocation.completeAllocation])

  // Initialize form data when budgetData changes
  useEffect(() => {
    if (budgetData && budgetData.totalAmount > 0) {
      // Initialize budget allocation with existing data first
      const allocationCategories = budgetData.categories
        .filter(cat => cat.category !== 'Others') // Exclude Others as it's auto-managed
        .map(cat => ({
          category_id: cat.id,
          category_name: cat.category,
          category_color: cat.color,
          allocated_amount: cat.budgetAmount,
          spent_amount: cat.spentAmount
        }))
      
      budgetAllocation.loadFromExistingBudget(
        budgetData.totalAmount,
        allocationCategories
      )
      
      // Get complete allocation including auto-managed "Others" category
      const completeAllocation = budgetAllocation.completeAllocation
      
      setEditForm({
        id: budgetData.id,
        name: budgetData.name,
        totalAmount: budgetData.totalAmount,
        period: budgetData.period,
        categories: completeAllocation.map(cat => ({
          id: cat.category_id,
          category: cat.category_name,
          budgetAmount: cat.allocated_amount,
          spentAmount: cat.spent_amount || 0,
          color: cat.category_color,
          status: 'good' as const
        }))
      })
    } else if (budgetData) {
      // Handle case where budgetData exists but totalAmount is 0 or invalid
      setEditForm({
        id: budgetData.id,
        name: budgetData.name,
        totalAmount: budgetData.totalAmount,
        period: budgetData.period,
        categories: [...budgetData.categories]
      })
      
      // Initialize with minimal allocation state
      budgetAllocation.initializeAllocation(1, 'USD') // Use 1 as minimum to avoid zero error
    }
  }, [budgetData]) // Removed budgetAllocation from dependencies to prevent infinite loop

  // Reset form when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate budget name
    if (!editForm.name.trim()) {
      newErrors.name = 'Budget name is required'
    } else if (editForm.name.trim().length < 3) {
      newErrors.name = 'Budget name must be at least 3 characters long'
    } else if (editForm.name.trim().length > 50) {
      newErrors.name = 'Budget name must be less than 50 characters'
    }

    // Validate total amount
    if (editForm.totalAmount <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0'
    // Removed maximum limit validation
    } else if (isNaN(editForm.totalAmount)) {
      newErrors.totalAmount = 'Please enter a valid number'
    }

    // Validate categories
    if (editForm.categories.length === 0) {
      newErrors.categories = 'At least one category is required'
    } else if (editForm.categories.length > 20) {
      newErrors.categories = 'Maximum 20 categories allowed'
    }

    editForm.categories.forEach((category, index) => {
      if (category.budgetAmount < 0) {
        newErrors[`category-${index}`] = 'Amount cannot be negative'
      } else if (category.budgetAmount === 0) {
        newErrors[`category-${index}`] = 'Amount must be greater than 0'
      } else if (category.budgetAmount > editForm.totalAmount) {
        newErrors[`category-${index}`] = 'Amount cannot exceed total budget'
      } else if (isNaN(category.budgetAmount)) {
        newErrors[`category-${index}`] = 'Please enter a valid number'
      }
    })

    // Check for duplicate categories
    const categoryNames = editForm.categories.map(c => c.category)
    const duplicates = categoryNames.filter((name, index) => categoryNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      newErrors.categories = 'Duplicate categories are not allowed'
    }

    // Check if total allocation exceeds budget
    const totalAllocated = calculateTotalAllocated()
    if (totalAllocated > editForm.totalAmount) {
      newErrors.totalAmount = `Total allocation (${formatCurrency(totalAllocated)}) exceeds budget`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the validation errors before saving')
      // Focus on first error field
      const firstErrorField = document.querySelector('.border-red-500') as HTMLElement
      if (firstErrorField) {
        firstErrorField.focus()
      }
      return
    }

    // Additional validation for over-allocation
    if (isOverAllocated) {
      toast.error('Cannot save budget with over-allocation. Please adjust category amounts.')
      return
    }

    setIsLoading(true)
    try {
      // Get complete allocation including auto-managed "Others" category
      const completeAllocation = budgetAllocation.completeAllocation
      
      // Merge with form data
      const updatedBudget = {
        ...editForm,
        categories: completeAllocation.map(cat => {
          const formCategory = editForm.categories.find(fc => fc.id === cat.category_id)
          return {
            id: cat.category_id,
            category: cat.category_name,
            budgetAmount: cat.allocated_amount,
            spentAmount: formCategory?.spentAmount || cat.spent_amount || 0,
            color: cat.category_color,
            status: formCategory?.status || 'good' as const
          }
        })
      }
      
      await onSave(updatedBudget)
      toast.success('Budget updated successfully')
      onClose()
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error('Failed to save budget. Please try again.')
      // Re-enable form for retry
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (budgetData) {
      setEditForm({
        id: budgetData.id,
        name: budgetData.name,
        totalAmount: budgetData.totalAmount,
        period: budgetData.period,
        categories: [...budgetData.categories]
      })
    }
    setErrors({})
    onClose()
  }

  const updateCategory = (index: number, field: keyof BudgetCategory, value: any) => {
    const category = editForm.categories[index]
    if (!category) return
    
    if (field === 'budgetAmount') {
      // Use allocation hook for amount updates
      const success = budgetAllocation.updateCategory(category.id, value)
      if (!success) {
        toast.error('Cannot update category amount')
        return
      }
      
      // Sync with form state using complete allocation to get updated Others category
      const completeAllocation = budgetAllocation.completeAllocation
      const syncedCategories = completeAllocation.map(cat => {
        const existingCategory = editForm.categories.find(existing => existing.id === cat.category_id)
        return {
          id: cat.category_id,
          category: cat.category_name,
          budgetAmount: cat.allocated_amount,
          spentAmount: existingCategory?.spentAmount || 0,
          color: cat.category_color,
          status: 'good' as const
        }
      })
      setEditForm(prev => ({ ...prev, categories: syncedCategories }))
    } else {
      // Handle other field updates normally
      const updatedCategories = [...editForm.categories]
      updatedCategories[index] = {
        ...updatedCategories[index],
        [field]: value
      }
      setEditForm(prev => ({ ...prev, categories: updatedCategories }))
    }
    
    // Clear specific error when user starts typing
    if (errors[`category-${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`category-${index}`]
        return newErrors
      })
    }
  }

  const addCategory = () => {
    const availableCategories = CATEGORIES.filter(cat => 
      cat !== 'Income' && !editForm.categories.some(existing => existing.category === cat)
    )
    
    if (availableCategories.length === 0) {
      toast.error('All categories have been added')
      return
    }

    const categoryName = availableCategories[0]
    const categoryColor = CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || '#6b7280'
    const categoryId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Use allocation hook to add category
    const success = budgetAllocation.addCategory(categoryId, categoryName, categoryColor, 0)
    if (!success) {
      toast.error('Cannot add category')
      return
    }

    // Sync with form state using complete allocation to get updated Others category
    const completeAllocation = budgetAllocation.completeAllocation
    const syncedCategories = completeAllocation.map(cat => {
      const existingCategory = editForm.categories.find(existing => existing.id === cat.category_id)
      return {
        id: cat.category_id,
        category: cat.category_name,
        budgetAmount: cat.allocated_amount,
        spentAmount: existingCategory?.spentAmount || 0,
        color: cat.category_color,
        status: 'good' as const
      }
    })
    setEditForm(prev => ({ ...prev, categories: syncedCategories }))
  }

  const removeCategory = (index: number) => {
    const category = editForm.categories[index]
    if (!category) return
    
    // Use allocation hook to remove category
    const success = budgetAllocation.removeCategory(category.id)
    if (!success) {
      toast.error('Cannot remove category')
      return
    }
    
    // Sync with form state using complete allocation to get updated Others category
    const completeAllocation = budgetAllocation.completeAllocation
    const syncedCategories = completeAllocation.map(cat => {
      const existingCategory = editForm.categories.find(existing => existing.id === cat.category_id)
      return {
        id: cat.category_id,
        category: cat.category_name,
        budgetAmount: cat.allocated_amount,
        spentAmount: existingCategory?.spentAmount || 0,
        color: cat.category_color,
        status: 'good' as const
      }
    })
    setEditForm(prev => ({ ...prev, categories: syncedCategories }))
    
    // Clear related errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`category-${index}`]
      return newErrors
    })
  }

  const calculateTotalAllocated = () => {
    return budgetAllocation.totalAllocated
  }

  const totalAllocated = calculateTotalAllocated()
  const remainingBudget = budgetAllocation.remainingAmount
  const isOverAllocated = remainingBudget < 0

  const availableCategoriesForAdd = CATEGORIES.filter(cat => 
    cat !== 'Income' && !editForm.categories.some(existing => existing.category === cat)
  )

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Budget</SheetTitle>
          <SheetDescription>
            Modify your budget breakdown and category allocations
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Budget Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-name">Budget Name</Label>
                <Input
                  id="budget-name"
                  value={editForm.name}
                  onChange={(e) => {
                    const value = e.target.value
                    setEditForm(prev => ({ ...prev, name: value }))
                    
                    // Real-time validation for name
                    if (errors.name) {
                      if (value.trim().length >= 3 && value.trim().length <= 50) {
                        setErrors(prev => ({ ...prev, name: '' }))
                      }
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur
                    const name = editForm.name.trim()
                    if (!name) {
                      setErrors(prev => ({ ...prev, name: 'Budget name is required' }))
                    } else if (name.length < 3) {
                      setErrors(prev => ({ ...prev, name: 'Budget name must be at least 3 characters long' }))
                    } else if (name.length > 50) {
                      setErrors(prev => ({ ...prev, name: 'Budget name must be less than 50 characters' }))
                    }
                  }}
                  placeholder="e.g., Monthly Budget"
                  className={errors.name ? 'border-red-500' : ''}
                  maxLength={50}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-period">Period</Label>
                  <Select
                    value={editForm.period}
                    onValueChange={(value: 'monthly' | 'yearly') => 
                      setEditForm(prev => ({ ...prev, period: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-amount">Total Budget Amount</Label>
                  <Input
                    id="total-amount"
                    type="number"
                    value={editForm.totalAmount || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      
                      // Update form state first
                      setEditForm(prev => ({ 
                        ...prev, 
                        totalAmount: value
                      }))
                      
                      // Update allocation hook
                      const success = budgetAllocation.updateTotalAmount(value)
                      if (!success) {
                        toast.error('Cannot update total amount')
                        return
                      }
                      
                      // Real-time validation for total amount
                      if (errors.totalAmount && value > 0) {
                        setErrors(prev => ({ ...prev, totalAmount: '' }))
                      }
                    }}
                    onBlur={() => {
                      // Validate on blur
                      const amount = editForm.totalAmount
                      if (amount <= 0) {
                        setErrors(prev => ({ ...prev, totalAmount: 'Total amount must be greater than 0' }))
                      // Removed maximum limit validation
                      } else if (isNaN(amount)) {
                        setErrors(prev => ({ ...prev, totalAmount: 'Please enter a valid number' }))
                      }
                    }}
                    placeholder="3000"
                    className={errors.totalAmount ? 'border-red-500' : ''}
                    min="0"
                    // Removed max limit
                    step="0.01"
                  />
                  {errors.totalAmount && (
                    <p className="text-sm text-red-500">{errors.totalAmount}</p>
                  )}
                </div>
              </div>

              {/* Budget Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Budget:</span>
                  <span className="font-medium">{formatCurrency(editForm.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Allocated:</span>
                  <span className={`font-medium ${isOverAllocated ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(totalAllocated)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className={`font-medium ${isOverAllocated ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingBudget)}
                  </span>
                </div>
                {isOverAllocated && (
                  <Badge variant="destructive" className="w-full justify-center">
                    ⚠️ Over-allocated by {formatCurrency(Math.abs(remainingBudget))}
                  </Badge>
                )}
                {remainingBudget > 0 && (
                  <Badge variant="secondary" className="w-full justify-center">
                    💰 {formatCurrency(remainingBudget)} available to allocate
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Allocations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Category Allocations</CardTitle>
                <Button
                  onClick={addCategory}
                  size="sm"
                  variant="outline"
                  disabled={availableCategoriesForAdd.length === 0 || isLoading}
                  title={availableCategoriesForAdd.length === 0 ? 'All categories have been added' : 'Add a new category'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                  {availableCategoriesForAdd.length === 0 && (
                    <span className="ml-2 text-xs text-gray-500">({availableCategoriesForAdd.length} left)</span>
                  )}
                </Button>
              </div>
              {errors.categories && (
                <p className="text-sm text-red-500">{errors.categories}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editForm.categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No categories added yet</p>
                  <p className="text-sm">Click "Add Category" to get started</p>
                </div>
              ) : (
                editForm.categories.map((category, index) => (
                  <div key={category.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <p className="font-medium">{category.category}</p>
                        </div>
                      </div>
                      {/* Only show remove button for non-Others categories */}
                      {category.category !== 'Others' && (
                        <Button
                          onClick={() => removeCategory(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isLoading}
                          title="Remove this category"
                          aria-label={`Remove ${category.category} category`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Budget Amount</Label>
                      <Input
                        type="number"
                        value={category.budgetAmount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          updateCategory(index, 'budgetAmount', value)
                          
                          // Real-time validation for category amount
                          const errorKey = `category-${index}`
                          if (errors[errorKey] && value > 0 && value <= editForm.totalAmount) {
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors[errorKey]
                              return newErrors
                            })
                          }
                        }}
                        onBlur={() => {
                          // Validate on blur
                          const amount = category.budgetAmount
                          const errorKey = `category-${index}`
                          if (amount < 0) {
                            setErrors(prev => ({ ...prev, [errorKey]: 'Amount cannot be negative' }))
                          } else if (amount === 0 && category.category !== 'Others') {
                            setErrors(prev => ({ ...prev, [errorKey]: 'Amount must be greater than 0' }))
                          } else if (amount > editForm.totalAmount) {
                            setErrors(prev => ({ ...prev, [errorKey]: 'Amount cannot exceed total budget' }))
                          } else if (isNaN(amount)) {
                            setErrors(prev => ({ ...prev, [errorKey]: 'Please enter a valid number' }))
                          }
                        }}
                        placeholder="0"
                        className={errors[`category-${index}`] ? 'border-red-500' : ''}
                        min="0"
                        max={editForm.totalAmount}
                        step="0.01"
                        disabled={category.category === 'Others'}
                        title={category.category === 'Others' ? 'Others category is automatically calculated' : ''}
                      />
                      {errors[`category-${index}`] && (
                        <p className="text-sm text-red-500">{errors[`category-${index}`]}</p>
                      )}
                      {category.category === 'Others' && (
                        <p className="text-xs text-gray-500">This amount is automatically calculated from unallocated budget</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Budget Exceeded Error Message */}
          {isOverAllocated && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 font-medium">
                Budget exceeded - please reduce item allocations
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || isOverAllocated || Object.keys(errors).length > 0}
              className={isOverAllocated ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}