'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Settings, Search, X, Loader2 } from 'lucide-react'
import { CATEGORIES, CATEGORY_COLORS, Category, CategoryGroup, CategoryGroupData, CategoryItem } from '@/types/app'
import { useCategoryManager } from '@/hooks/use-category-manager'

// Default category groups
export const DEFAULT_CATEGORY_GROUPS: CategoryGroupData[] = [
  {
    id: 'EXPENSE',
    name: 'Expense',
    categories: CATEGORIES.filter(cat => cat !== 'Income').map((cat, index) => ({
      id: `expense-${index}`,
      name: cat,
      color: CATEGORY_COLORS[cat],
      group: 'EXPENSE' as CategoryGroup
    }))
  },
  {
    id: 'INCOME',
    name: 'Income',
    categories: [{
      id: 'income-0',
      name: 'Income' as Category,
      color: CATEGORY_COLORS['Income'],
      group: 'INCOME' as CategoryGroup
    }]
  }
]

interface CategoryManagerProps {
  userId: string
  onCategoryUpdated?: (groups: CategoryGroupData[]) => void
  className?: string
  fallbackToDefaults?: boolean
}

export function CategoryManager({ 
  userId,
  onCategoryUpdated,
  className = '',
  fallbackToDefaults = true
}: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>('EXPENSE')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6B7280')
  
  const {
    categoryGroups,
    isLoading,
    error,
    addCategory,
    editCategory,
    removeCategory,
    initializeDefaults
  } = useCategoryManager({ 
    userId, 
    onCategoriesChanged: onCategoryUpdated 
  })
  
  // Use default categories as fallback if no user categories exist
  const displayGroups = categoryGroups.length === 0 && fallbackToDefaults 
    ? DEFAULT_CATEGORY_GROUPS 
    : categoryGroups

  const filteredCategories = displayGroups
    .find(group => group.id === selectedGroup)
    ?.categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      await addCategory(newCategoryName.trim(), newCategoryColor, selectedGroup)
      setNewCategoryName('')
      setNewCategoryColor('#6B7280')
    } catch (error) {
      // Error is already handled in the hook
      console.error('Failed to add category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await removeCategory(categoryId)
    } catch (error) {
      // Error is already handled in the hook
      console.error('Failed to delete category:', error)
    }
  }

  const handleUpdateCategoryColor = async (categoryId: string, newColor: string) => {
    try {
      const category = getAllCategories(categoryGroups).find(cat => cat.id === categoryId)
      if (category) {
        await editCategory(categoryId, category.name, newColor)
      }
    } catch (error) {
      // Error is already handled in the hook
      console.error('Failed to update category color:', error)
    }
  }

  const handleAddNewGroup = () => {
    // This could be extended to allow custom groups
    console.log('Add new group functionality can be implemented here')
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Categories
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>MANAGE CATEGORIES</SheetTitle>
          <SheetDescription>
            Create, edit, and organize your budget categories
          </SheetDescription>
        </SheetHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {categoryGroups.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No categories found. Initialize default categories to get started.</p>
            <Button onClick={initializeDefaults} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initialize Default Categories
            </Button>
          </div>
        )}
        
        <div className="mt-6 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Group Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Select value={selectedGroup} onValueChange={(value: CategoryGroup) => setSelectedGroup(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleAddNewGroup}>
                NEW GROUP
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              {categoryGroups.find(g => g.id === selectedGroup)?.name}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={category.color}
                      onChange={(e) => handleUpdateCategoryColor(category.id, e.target.value)}
                      className="w-6 h-6 rounded border-0 cursor-pointer"
                    />
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {category.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Category */}
          <div className="space-y-3 border-t pt-4">
            <div className="text-sm font-medium text-gray-700">Add New Category</div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-8 h-8 rounded border-0 cursor-pointer"
              />
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleAddCategory} 
                size="sm"
                disabled={!newCategoryName.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Rules Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">RULES</div>
              <Button variant="outline" size="sm">
                ADD RULE
              </Button>
            </div>
            <div className="text-sm text-gray-500">No rule found..</div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">TAGS</div>
              <Button variant="outline" size="sm">
                ADD NEW TAG
              </Button>
            </div>
            <div className="text-sm text-gray-500">No tag found..</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Helper functions for backward compatibility
export function getCategoriesByGroup(groups: CategoryGroupData[], groupId: CategoryGroup): CategoryItem[] {
  return groups.find(group => group.id === groupId)?.categories || []
}

export function getAllCategories(groups: CategoryGroupData[]): CategoryItem[] {
  return groups.flatMap(group => group.categories)
}

export function getCategoryColor(groups: CategoryGroupData[], categoryName: string): string {
  const allCategories = getAllCategories(groups)
  return allCategories.find(cat => cat.name === categoryName)?.color || '#6B7280'
}

// Export for backward compatibility
export { CATEGORIES, CATEGORY_COLORS } from '@/types/app'