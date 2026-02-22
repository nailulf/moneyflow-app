'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Pencil, X, Info, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Badge } from '@/components/ui/atoms/badge'
import { Skeleton } from '@/components/ui/atoms/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Alert, AlertDescription } from '@/components/ui/molecules/alert'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/data-utils'
import { calculateBudgetStatus } from '@/lib/budget-utils'
import { useBudgetAllocation } from '@/hooks/useBudgetAllocation'
import {
  createBudgetPlan,
  updateBudgetPlan,
  getAvailableCategories,
  type BudgetPlanWithCategories,
} from '@/lib/api/budget-plans'
import type { BudgetSnapshotWithSpending } from '@/lib/api/budget-snapshots'
import type { CategoryDB } from '@/types/database'

// Simple inline progress bar
const Progress = ({ value = 0, className = '' }: { value?: number; className?: string }) => {
  const percentage = Math.min(Math.max(value, 0), 100)
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY']

interface BudgetOverviewCardProps {
  period: 'monthly' | 'yearly'
  snapshot: BudgetSnapshotWithSpending | null
  snapshotLoading: boolean
  noSnapshot: boolean
  snapshotError: string | null
  plan: BudgetPlanWithCategories | null
  planLoading: boolean
  onPlanSaved: () => void
}

export function BudgetOverviewCard({
  period,
  snapshot,
  snapshotLoading,
  noSnapshot,
  snapshotError,
  plan,
  planLoading,
  onPlanSaved,
}: BudgetOverviewCardProps) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<CategoryDB[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryAmount, setCategoryAmount] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [currency, setCurrency] = useState('IDR')

  const budgetAllocation = useBudgetAllocation(0, 'IDR')

  const isLoading = snapshotLoading || planLoading

  // Determine if this is the current period (editing allowed)
  const isCurrentPeriod = useMemo(() => {
    if (!snapshot) return true // No snapshot = assume current period for creation
    return snapshot.status === 'active'
  }, [snapshot])

  // Snapshot-derived values
  const totalBudget = snapshot?.total_amount || 0
  const totalSpent = snapshot?.total_spent || 0
  const budgetRemaining = totalBudget - totalSpent
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const snapshotCurrency = snapshot?.currency || 'IDR'

  // Load available categories when entering edit mode
  const loadAvailableCategories = async () => {
    if (!user?.id) return
    try {
      const cats = await getAvailableCategories(user.id, period)
      setAvailableCategories(cats)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const enterEditMode = () => {
    // Initialize editor from plan data
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
    loadAvailableCategories()
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

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

  // Categories already allocated
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
      setIsEditing(false)
      onPlanSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const periodLabel = period === 'monthly' ? 'month' : 'year'
  const hasExistingSnapshot = !!snapshot && !noSnapshot

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- EDIT MODE ---
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{plan ? 'Edit Budget' : 'Set Up Budget'}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label className="text-xs">Total Budget</Label>
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
            <Label className="text-xs">Currency</Label>
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
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Allocated: {formatCurrency(budgetAllocation.totalAllocated, currency)}
            </span>
            <span className={budgetAllocation.remainingAmount < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Remaining: {formatCurrency(budgetAllocation.remainingAmount, currency)}
            </span>
          </div>

          {/* Add Category */}
          <div className="space-y-2">
            <Label className="text-xs">Add Category</Label>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs">{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {pickableCategories.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="amount"
                min={0}
                className="w-20 h-8 text-xs"
                value={categoryAmount}
                onChange={(e) => setCategoryAmount(e.target.value)}
                placeholder="0"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={handleAddCategory}
                disabled={!selectedCategoryId || !categoryAmount}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Allocated categories list */}
          <div className="space-y-1.5">
            {budgetAllocation.allocatedCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-md border px-2 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.category_color }}
                  />
                  <span className="text-xs">{cat.category_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {formatCurrency(cat.allocated_amount, currency)}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => budgetAllocation.removeCategory(cat.category_id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            {budgetAllocation.allocatedCategories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No categories allocated yet.
              </p>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={handleSave}
              disabled={saving || totalAmount <= 0 || budgetAllocation.remainingAmount < 0}
            >
              {saving ? 'Saving...' : plan ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- ERROR STATE ---
  if (snapshotError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-destructive">
            <p className="text-sm">Error loading budget data.</p>
            <p className="text-xs text-muted-foreground mt-1">{snapshotError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- EMPTY STATE (no snapshot, no plan) ---
  if (noSnapshot && !plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>No budget for this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No budget data for this period.</p>
            <Button size="sm" className="mt-3" onClick={enterEditMode}>
              Set up your budget
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- VIEW MODE (snapshot exists) ---
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Budget Overview</CardTitle>
            <CardDescription className="text-xs">
              {period === 'monthly' ? 'Monthly' : 'Yearly'} Budget
              {snapshot?.status === 'active' ? ' — Current' : snapshot?.status === 'closed' ? ' — Past' : ''}
            </CardDescription>
          </div>
          {isCurrentPeriod && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={enterEditMode}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-lg font-bold text-primary">
              {formatCurrency(totalBudget, snapshotCurrency)}
            </div>
            <div className="text-xs text-primary">Budget</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="text-lg font-bold text-success">
              {formatCurrency(totalSpent, snapshotCurrency)}
            </div>
            <div className="text-xs text-success">Spent</div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Overall Progress</span>
            <span>{budgetProgress.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(budgetProgress, 100)} className="h-1.5" />
          {budgetProgress > 100 && (
            <p className="text-xs text-destructive">Over budget by {formatCurrency(Math.abs(budgetRemaining), snapshotCurrency)}</p>
          )}
        </div>

        {/* Category breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium">By Category</h4>
          {(snapshot?.budget_snapshot_categories || []).map((cat) => {
            const catName = cat.categories?.name || 'Unknown'
            const catColor = cat.categories?.color || '#888'
            const allocated = cat.allocated_amount
            const spent = cat.spent_amount
            const catProgress = allocated > 0 ? (spent / allocated) * 100 : 0
            const status = calculateBudgetStatus(spent, allocated)

            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <span className="truncate">{catName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">
                      {formatCurrency(spent, snapshotCurrency)}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span>{formatCurrency(allocated, snapshotCurrency)}</span>
                    <Badge
                      variant={status === 'over' ? 'destructive' : status === 'warning' ? 'secondary' : 'outline'}
                      className="text-[10px] px-1 py-0"
                    >
                      {status === 'over' ? 'Over' : status === 'warning' ? '!' : 'OK'}
                    </Badge>
                  </div>
                </div>
                <Progress value={Math.min(catProgress, 100)} className="h-1" />
              </div>
            )
          })}

          {(snapshot?.budget_snapshot_categories || []).length === 0 && (
            <p className="text-xs text-muted-foreground">No categories in this budget.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
