'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/organisms/sheet'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Badge } from '@/components/ui/atoms/badge'
import { Trash2, Plus, Calendar, DollarSign, Target } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryDB } from '@/types/database'
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/data-utils'
import { preferences } from '@/lib/api/user-preferences'
import { useBudgetAllocation } from '@/hooks/useBudgetAllocation'
import { useAuth } from '@/contexts/AuthContext'
import { Analytics } from '@/lib/analytics/amplitude'
import { useIsMobile } from '@/hooks/use-mobile'

interface BudgetCategory {
  category_id: string
  allocated_amount: number
  category?: CategoryDB
}

interface Budget {
  id: string
  name: string
  total_amount: number
  period: 'monthly' | 'yearly'
  year: number
  month?: number
  currency: string
  is_active: boolean
  budget_categories: {
    id: string
    allocated_amount: number
    spent_amount: number
    category: {
      id: string
      name: string
      color: string
    }
  }[]
}

interface BudgetCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onBudgetCreated: (budget: Budget) => void
  categories: CategoryDB[]
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR + i)



export function BudgetCreationModal({ isOpen, onClose, onBudgetCreated, categories }: BudgetCreationModalProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const userId = user?.id || ''
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Budget basic info
  const [budgetName, setBudgetName] = useState('')
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [totalAmount, setTotalAmount] = useState('')
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  
  // Budget categories
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryAmount, setCategoryAmount] = useState('')
  
  // Initialize budget allocation hook with minimum value to prevent zero error
  const budgetAllocation = useBudgetAllocation(1, DEFAULT_CURRENCY)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setBudgetName('')
      setPeriod('monthly')
      setYear(CURRENT_YEAR)
      setMonth(new Date().getMonth() + 1)
      setTotalAmount('')
      setBudgetCategories([])
      setSelectedCategoryId('')
      setCategoryAmount('')

      // Reset allocation hook with a minimal valid amount
      // It will be updated when user enters the actual total amount
      budgetAllocation.initializeAllocation(1, DEFAULT_CURRENCY)

      // Load user's preferred currency
      if (userId) {
        preferences.getCurrency(userId).then(userCurrency => {
          setCurrency(userCurrency)
        }).catch(() => {
          setCurrency(DEFAULT_CURRENCY)
        })
      } else {
        setCurrency(DEFAULT_CURRENCY)
      }

      // Track budget creation form opened
      Analytics.track('Create Budget Form Opened', {
        trigger: 'budget_manager'
      })
    }
    // Removed budgetAllocation from dependencies to prevent infinite loop
  }, [isOpen, userId])

  // Initialize allocation when entering step 2 or when total amount changes in step 2
  useEffect(() => {
    const amount = parseFloat(totalAmount) || 0
    if (amount > 0 && step === 2) {
      // Ensure allocation is properly initialized with the correct total amount
      // This handles cases where the state wasn't updated in time during transition
      if (budgetAllocation.allocationState.totalAmount !== amount) {
        budgetAllocation.initializeAllocation(amount, currency)
      }
    }
  }, [step, totalAmount, currency, budgetAllocation.allocationState.totalAmount])

  const handleAddCategory = () => {
    if (!selectedCategoryId || !categoryAmount) {
      toast.error('Please select a category and enter an amount')
      return
    }

    const amount = parseFloat(categoryAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const category = categories.find(c => c.id === selectedCategoryId)
    if (!category) {
      toast.error('Selected category not found')
      return
    }

    const budgetTotal = parseFloat(totalAmount) || 0

    // Calculate current allocated total from local state (more reliable than hook state during transitions)
    const currentAllocated = budgetCategories.reduce((sum, bc) => sum + bc.allocated_amount, 0)
    const availableAmount = budgetTotal - currentAllocated

    // Validate against local state to avoid stale closure issues
    if (amount > availableAmount) {
      toast.error(`Amount exceeds available budget. Available: ${availableAmount.toFixed(2)}`)
      return
    }

    // Check if category already exists in local state
    if (budgetCategories.some(bc => bc.category_id === selectedCategoryId)) {
      toast.error('Category already added to this budget')
      return
    }

    // Ensure allocation state is in sync before adding
    if (budgetAllocation.allocationState.totalAmount !== budgetTotal) {
      budgetAllocation.initializeAllocation(budgetTotal, currency)
      // Re-add all existing categories to sync the hook state
      budgetCategories.forEach(bc => {
        if (bc.category) {
          budgetAllocation.addCategory(bc.category_id, bc.category.name, bc.category.color, bc.allocated_amount)
        }
      })
    }

    // Use allocation hook to add category
    const success = budgetAllocation.addCategory(
      selectedCategoryId,
      category.name,
      category.color,
      amount
    )

    if (!success) {
      // If hook fails but our local validation passed, add anyway with warning
      console.warn('Budget allocation hook failed, but local validation passed. Proceeding with local state.')
    }

    // Update local state for UI (this is the source of truth)
    setBudgetCategories(prev => [...prev, {
      category_id: selectedCategoryId,
      allocated_amount: amount,
      category
    }])

    Analytics.track('Budget Category Added', {
      budget_name: budgetName,
      category_id: selectedCategoryId,
      category_name: category.name,
      allocated_amount: amount,
      total_categories: budgetCategories.length + 1
    })

    setSelectedCategoryId('')
    setCategoryAmount('')
    toast.success(`Added ${category.name} with ${amount} allocation`)
  }

  const handleRemoveCategory = (categoryId: string) => {
    const categoryToRemove = budgetCategories.find(bc => bc.category_id === categoryId)

    Analytics.track('Budget Category Removed', {
      budget_name: budgetName,
      category_id: categoryId,
      category_name: categoryToRemove?.category?.name,
      allocated_amount: categoryToRemove?.allocated_amount,
      remaining_categories: budgetCategories.length - 1
    })

    // Try to remove from allocation hook (best effort, don't block on failure)
    budgetAllocation.removeCategory(categoryId)

    // Update local state for UI (this is the source of truth)
    setBudgetCategories(prev => prev.filter(bc => bc.category_id !== categoryId))

    if (categoryToRemove?.category) {
      toast.success(`Removed ${categoryToRemove.category.name}`)
    }
  }

  const getTotalAllocated = () => {
    return budgetCategories.reduce((sum, bc) => sum + bc.allocated_amount, 0)
  }

  const getRemainingAmount = () => {
    const budgetTotal = parseFloat(totalAmount) || 0
    return budgetTotal - getTotalAllocated()
  }

  const canProceedToStep2 = () => {
    return budgetName.trim() && totalAmount && parseFloat(totalAmount) > 0
  }

  // Handle transition from step 1 to step 2
  const handleProceedToStep2 = () => {
    const amount = parseFloat(totalAmount) || 0

    Analytics.track('Budget Creation Next Step Clicked', {
      budget_name: budgetName,
      total_amount: amount,
      period: period,
      currency: currency
    })

    if (amount > 0) {
      // Initialize allocation with the correct total amount before proceeding
      budgetAllocation.initializeAllocation(amount, currency)
    }
    setStep(2)
  }

  const canCreateBudget = () => {
    if (budgetCategories.length === 0) return false
    const budgetTotal = parseFloat(totalAmount) || 0
    const totalAllocated = budgetCategories.reduce((sum, bc) => sum + bc.allocated_amount, 0)
    return totalAllocated <= budgetTotal
  }

  const handleCreateBudget = async () => {
    if (budgetCategories.length === 0) {
      toast.error('Please add at least one category allocation')
      return
    }

    const budgetTotal = parseFloat(totalAmount) || 0
    const totalAllocated = budgetCategories.reduce((sum, bc) => sum + bc.allocated_amount, 0)

    if (totalAllocated > budgetTotal) {
      toast.error('Total allocations exceed budget amount')
      return
    }

    setIsLoading(true)
    try {
      // Build allocation data directly from local state (source of truth)
      const allocationData = budgetCategories.map(bc => ({
        category_id: bc.category_id,
        allocated_amount: bc.allocated_amount
      }))

      // Add "Others" category for remaining amount if any
      const remainingAmount = budgetTotal - totalAllocated
      if (remainingAmount > 0) {
        allocationData.push({
          category_id: 'others-category',
          allocated_amount: Math.round(remainingAmount * 100) / 100
        })
      }

      const budgetData = {
        userId, // Add userId to the payload
        name: budgetName,
        total_amount: budgetTotal,
        period,
        year,
        month: period === 'monthly' ? month : null,
        currency,
        categories: allocationData
      }

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create budget')
      }

      const { budget } = await response.json()

      // Track successful budget creation
      Analytics.track('Budget Created', {
        budget_id: budget.id,
        budget_name: budgetName,
        total_amount: parseFloat(totalAmount),
        period: period,
        year: year,
        month: period === 'monthly' ? month : null,
        currency: currency,
        categories_count: budgetCategories.length
      })

      toast.success('Budget created successfully!')
      onBudgetCreated(budget)
      onClose()
    } catch (error) {
      console.error('Error creating budget:', error)

      // Track budget creation failure
      Analytics.track('Budget Creation Failed', {
        budget_name: budgetName,
        period: period,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      toast.error(error instanceof Error ? error.message : 'Failed to create budget')
    } finally {
      setIsLoading(false)
    }
  }

  const availableCategories = categories.filter(
    cat => !budgetCategories.some(bc => bc.category_id === cat.id)
  )

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[95vh] rounded-t-xl w-full' : ''}>
         <SheetHeader>
           <SheetTitle className="flex items-center gap-2">
             <Target className="h-5 w-5" />
             Create New Budget
           </SheetTitle>
         </SheetHeader>
         <div className="mt-6 overflow-y-auto max-h-[calc(100vh-120px)]">

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Budget Name</div>
                <Input
                  id="budget-name"
                  placeholder="e.g., Monthly Budget"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Period</div>
                <Select value={period} onValueChange={(value: 'monthly' | 'yearly') => setPeriod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Year</div>
                <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {period === 'monthly' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Month</div>
                  <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Total Budget Amount</div>
                <Input
                  id="total-amount"
                  type="amount"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Currency</div>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleProceedToStep2}
                disabled={!canProceedToStep2()}
                className="flex items-center gap-2"
              >
                Next: Allocate Categories
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Budget</p>
                    <p className="font-semibold">{formatCurrency(parseFloat(totalAmount || '0'), currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Allocated</p>
                    <p className="font-semibold">{formatCurrency(getTotalAllocated(), currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className={`font-semibold ${getRemainingAmount() < 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(getRemainingAmount(), currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {getRemainingAmount() < 0 && (
              <Card className="border-destructive/20 bg-destructive/10">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Validation Error:</p>
                    <p className="text-sm text-destructive">
                      Total allocations exceed budget by {formatCurrency(Math.abs(getRemainingAmount()), currency)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Add Category Allocation</h3>
              <div className="flex gap-2">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="amount"
                  placeholder="Amount"
                  value={categoryAmount}
                  onChange={(e) => setCategoryAmount(e.target.value)}
                  className="w-32"
                />
                <Button onClick={handleAddCategory} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {budgetCategories.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Category Allocations</h3>
                <div className="space-y-2">
                  {budgetCategories.map((budgetCategory) => (
                    <div key={budgetCategory.category_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: budgetCategory.category?.color || 'hsl(var(--muted-foreground))' }}
                        />
                        <span className="font-medium">{budgetCategory.category?.name}</span>
                        <Badge variant="secondary">
                          {formatCurrency(budgetCategory.allocated_amount, currency)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCategory(budgetCategory.category_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => {
                Analytics.track('Budget Creation Back Clicked', {
                  budget_name: budgetName,
                  categories_count: budgetCategories.length
                })
                setStep(1)
              }}>
                Back
              </Button>
              <Button 
                onClick={handleCreateBudget} 
                disabled={!canCreateBudget() || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? 'Creating...' : 'Create Budget'}
                <Target className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
         </div>
       </SheetContent>
     </Sheet>
  )
}
