'use client'

import { useState } from 'react'
import { CategoryManager, DEFAULT_CATEGORY_GROUPS } from './CategoryManager'
import { CategoryGroupData, CategoryItem } from '@/types/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Example 1: Using CategoryManager with state management
export function CategoryManagerExample() {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupData[]>(DEFAULT_CATEGORY_GROUPS)

  const handleCategoryUpdate = (updatedGroups: CategoryGroupData[]) => {
    setCategoryGroups(updatedGroups)
    console.log('Categories updated:', updatedGroups)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category Manager Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CategoryManager 
                userId="test-user"
                onCategoryUpdated={handleCategoryUpdate}
              />
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Current Category Groups</h3>
              {categoryGroups.map(group => (
                <div key={group.id} className="mb-4">
                  <h4 className="font-medium mb-2">{group.name} ({group.categories.length} categories)</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.categories.map((category: CategoryItem) => (
                      <Badge 
                        key={category.id} 
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                        {category.isCustom && <span className="text-xs">(Custom)</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Example 2: Integration with existing components
export function CategoryManagerIntegrationExample() {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupData[]>(DEFAULT_CATEGORY_GROUPS)

  // Helper function to get all expense categories
  const getExpenseCategories = () => {
    return categoryGroups
      .find(group => group.id === 'EXPENSE')
      ?.categories.map((cat: CategoryItem) => cat.name) || []
  }

  // Helper function to get all income categories
  const getIncomeCategories = () => {
    return categoryGroups
      .find(group => group.id === 'INCOME')
      ?.categories.map((cat: CategoryItem) => cat.name) || []
  }

  // Helper function to get category color
  const getCategoryColor = (categoryName: string) => {
    for (const group of categoryGroups) {
      const category = group.categories.find((cat: CategoryItem) => cat.name === categoryName)
      if (category) return category.color
    }
    return '#6B7280' // Default gray
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CategoryManager 
                userId="test-user"
                onCategoryUpdated={setCategoryGroups}
              />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="font-medium mb-2">Expense Categories</h4>
                <div className="space-y-1">
                  {getExpenseCategories().map((category: string) => (
                    <div key={category} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      {category}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Income Categories</h4>
                <div className="space-y-1">
                  {getIncomeCategories().map((category: string) => (
                    <div key={category} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getCategoryColor(category) }}
                      />
                      {category}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Example 3: Using with existing BudgetManager
import { BudgetManager } from './BudgetManager'

export function BudgetManagerWithCategoryExample() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Manager with Category Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetManager 
            onBudgetCreated={(budget) => console.log('Budget created:', budget)}
          />
        </CardContent>
      </Card>
    </div>
  )
}