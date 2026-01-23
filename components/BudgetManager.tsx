'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { CATEGORIES, CATEGORY_COLORS, CategoryGroupData } from '@/types/app'


interface Budget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: BudgetCategory[]
}

interface BudgetCategory {
  id: string
  category: string
  budgetAmount: number
  spentAmount: number
  color: string
}

// Note: ManageCategories component has been moved to CategoryManager.tsx

// Create Budget Component
interface CreateBudgetProps {
  onBudgetCreated?: (budget: Omit<Budget, 'id'>) => void
  className?: string
}

export function CreateBudget({ 
  onBudgetCreated,
  className = '' 
}: CreateBudgetProps) {
  const [createBudgetOpen, setCreateBudgetOpen] = useState(false)
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    period: 'monthly' as 'monthly' | 'yearly',
    totalAmount: '',
    categoryAllocations: {} as Record<string, string>
  })

  const handleCreateBudget = () => {
    if (!budgetForm.name || !budgetForm.totalAmount) return

    const newBudget: Omit<Budget, 'id'> = {
      name: budgetForm.name,
      totalAmount: parseFloat(budgetForm.totalAmount),
      period: budgetForm.period,
      categories: Object.entries(budgetForm.categoryAllocations)
        .filter(([, amount]) => amount && parseFloat(amount) > 0)
        .map(([category, amount]) => ({
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category,
          budgetAmount: parseFloat(amount),
          spentAmount: 0,
          color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'hsl(var(--muted-foreground))'
        }))
    }

    onBudgetCreated?.(newBudget)
    setCreateBudgetOpen(false)
    setBudgetForm({
      name: '',
      period: 'monthly',
      totalAmount: '',
      categoryAllocations: {}
    })
  }

  const handleCategoryAllocationChange = (category: string, amount: string) => {
    setBudgetForm(prev => ({
      ...prev,
      categoryAllocations: {
        ...prev.categoryAllocations,
        [category]: amount
      }
    }))
  }

  return (
    <Sheet open={createBudgetOpen} onOpenChange={setCreateBudgetOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create New Budget</SheetTitle>
            <SheetDescription>
              Set up a new budget with category allocations
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Name</label>
              <Input 
                placeholder="e.g., Monthly Budget" 
                value={budgetForm.name}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select 
                value={budgetForm.period} 
                onValueChange={(value: 'monthly' | 'yearly') => 
                  setBudgetForm(prev => ({ ...prev, period: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Budget Amount</label>
              <Input 
                type="number" 
                placeholder="3000" 
                value={budgetForm.totalAmount}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, totalAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Category Allocations</label>
              {CATEGORIES.filter(cat => cat !== 'Income').map((category) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    />
                    <span className="text-sm">{category}</span>
                  </div>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="w-24 h-8"
                    value={budgetForm.categoryAllocations[category] || ''}
                    onChange={(e) => handleCategoryAllocationChange(category, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleCreateBudget}>
              Create Budget
            </Button>
          </div>
        </SheetContent>
    </Sheet>
  )
}

// Combined Budget Manager Component (for backward compatibility)
interface BudgetManagerProps {
  budgets?: Budget[]
  onBudgetCreated?: (budget: Omit<Budget, 'id'>) => void
  onCategoryUpdated?: (groups: CategoryGroupData[]) => void
  className?: string
}

export function BudgetManager({ 
  onBudgetCreated,
  className = '' 
}: BudgetManagerProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <CreateBudget onBudgetCreated={onBudgetCreated} />
    </div>
  )
}