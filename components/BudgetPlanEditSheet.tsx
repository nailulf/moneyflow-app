'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/organisms/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Badge } from '@/components/ui/atoms/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Alert, AlertDescription } from '@/components/ui/molecules/alert'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/data-utils'
import { useBudgetAllocation } from '@/hooks/useBudgetAllocation'
import {
  createBudgetPlan,
  updateBudgetPlan,
  getAvailableCategories,
  type BudgetPlanWithCategories,
} from '@/lib/api/budget-plans'
import type { CategoryDB } from '@/types/database'

const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AED', 'SAR']

interface BudgetPlanEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: 'monthly' | 'yearly'
  plan: BudgetPlanWithCategories | null
  hasExistingSnapshot: boolean
  onPlanSaved: () => void
}

export function BudgetPlanEditSheet({
  open,
  onOpenChange,
  period,
  plan,
  hasExistingSnapshot,
  onPlanSaved,
}: BudgetPlanEditSheetProps) {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<CategoryDB[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryAmount, setCategoryAmount] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [currency, setCurrency] = useState('IDR')

  const budgetAllocation = useBudgetAllocation(0, 'IDR')

  const periodLabel = period === 'monthly' ? 'month' : 'year'

  // Initialize when sheet opens
  useEffect(() => {
    if (!open) return

    if (plan) {
      setTotalAmount(plan.total_amount)
      setCurrency(plan.currency)
      const existingCategories = plan.budget_plan_categories.map((pc) => ({
        category_id: pc.category_id,
        category_name: pc.categories.name,
        category_color: pc.categories.color,
        allocated_amount: pc.allocated_amount,
      }))
      budgetAllocation.loadFromExistingBudget(plan.total_amount, existingCategories, plan.currency)
    } else {
      setTotalAmount(0)
      setCurrency('IDR')
      budgetAllocation.initializeAllocation(0, 'IDR')
    }
    setSelectedCategoryId('')
    setCategoryAmount('')

    // Load available categories
    if (user?.id) {
      getAvailableCategories(user.id, period)
        .then(setAvailableCategories)
        .catch((err) => console.error('Failed to load categories:', err))
    }
  }, [open])

  const handleTotalAmountChange = (value: string) => {
    const num = parseFloat(value) || 0
    setTotalAmount(num)
    budgetAllocation.updateTotalAmount(num)
  }

  const handleAddCategory = () => {
    if (!selectedCategoryId || !categoryAmount) return
    const cat = availableCategories.find((c) => c.id === selectedCategoryId)
    if (!cat) return

    const amount = parseFloat(categoryAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const success = budgetAllocation.addCategory(cat.id, cat.name, cat.color, amount)
    if (success) {
      setSelectedCategoryId('')
      setCategoryAmount('')
    }
  }

  const allocatedCategoryIds = useMemo(
    () => new Set(budgetAllocation.allocatedCategories.map((c) => c.category_id)),
    [budgetAllocation.allocatedCategories]
  )

  const pickableCategories = useMemo(
    () => availableCategories.filter((c) => !allocatedCategoryIds.has(c.id)),
    [availableCategories, allocatedCategoryIds]
  )

  const handleSave = async () => {
    if (!user?.id) return
    if (totalAmount <= 0) {
      toast.error('Total budget must be greater than 0')
      return
    }

    setSaving(true)
    try {
      const categories = budgetAllocation.toDatabaseFormat().filter(
        (c) => c.category_id !== 'others-category'
      )

      if (plan) {
        await updateBudgetPlan({
          id: plan.id,
          total_amount: totalAmount,
          currency,
          categories,
        })
      } else {
        await createBudgetPlan({
          userId: user.id,
          period,
          total_amount: totalAmount,
          currency,
          categories,
        })
      }

      toast.success(plan ? 'Budget updated' : 'Budget created')
      onPlanSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'rounded-t-2xl overflow-hidden' : 'w-full sm:max-w-md'}
      >
          <SheetHeader>
            <SheetTitle>{plan ? 'Edit Budget' : 'Set Up Budget'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4 pt-4 space-y-4">
          {/* Forward-only notice */}
          {hasExistingSnapshot && (
            <Alert className="py-2">
              <Info className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Changes apply starting <strong>next {periodLabel}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Total + Currency */}
          <div className="space-y-2">
            <Label className="text-sm">Total Budget</Label>
            <Input
              type="amount"
              min={0}
              step="0.01"
              value={totalAmount || ''}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              placeholder="Enter total budget"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Allocation summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Allocated: {formatCurrency(budgetAllocation.totalAllocated, currency)}
            </span>
            <span className={budgetAllocation.remainingAmount < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Remaining: {formatCurrency(budgetAllocation.remainingAmount, currency)}
            </span>
          </div>

          {/* Add Category */}
          <div className="space-y-2">
            <Label className="text-sm">Add Category</Label>
            <div className="grid grid-cols-6 gap-2 sm:flex-row items-center">
              <div className="w-full sm:flex-1 col-span-2">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="h-11 text-sm sm:h-9 w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {pickableCategories.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  type="amount"
                  min={0}
                  className="w-full h-11 sm:w-24 sm:h-9"
                  value={categoryAmount}
                  onChange={(e) => setCategoryAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-1">
                <Button
                  className="h-11 w-full shrink-0 sm:h-9 sm:w-9 col-span-1"
                  onClick={handleAddCategory}
                  disabled={!selectedCategoryId || !categoryAmount}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Allocated categories list */}
          <div className="space-y-2 pt-2 border-t max-h-[40dvh] overflow-y-auto">
            {budgetAllocation.allocatedCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.category_color }}
                  />
                  <span className="text-sm">{cat.category_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-2 py-0">
                    {formatCurrency(cat.allocated_amount, currency)}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 p-0 sm:h-7 sm:w-7"
                    onClick={() => budgetAllocation.removeCategory(cat.category_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            {budgetAllocation.allocatedCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories allocated yet.
              </p>
            )}
          </div>

          {/* Save / Cancel */}
          </div>
          <SheetFooter className="border-t p-4 safe-area-inset-bottom">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || totalAmount <= 0 || budgetAllocation.remainingAmount < 0}
            >
              {saving ? 'Saving...' : plan ? 'Update Budget' : 'Create Budget'}
            </Button>
          </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
