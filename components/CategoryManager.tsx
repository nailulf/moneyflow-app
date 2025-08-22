'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Settings, Search, X, Loader2, Trash2 } from 'lucide-react'
import { CATEGORIES, CATEGORY_COLORS, Category, CategoryGroup, CategoryGroupData, CategoryItem, CategoryGroupType } from '@/types/app'
import { useCategories } from '@/contexts/CategoryContext'
import { createCategory, deleteCategory } from '@/lib/api/categories'

// Default category groups - Extended to include TRANSFER
export const DEFAULT_CATEGORY_GROUPS: CategoryGroupData[] = [
  {
    id: 'EXPENSE',
    name: 'Expense',
    type: 'EXPENSE',
    color: '#EF4444',
    isDefault: true,
    isActive: true,
    sortOrder: 1,
    categories: CATEGORIES.filter(cat => cat !== 'Income').map((cat, index) => ({
      id: `expense-${index}`,
      name: cat,
      color: CATEGORY_COLORS[cat],
      groupType: 'EXPENSE' as CategoryGroup,
      categoryGroupId: 'EXPENSE'
    }))
  },
  {
    id: 'INCOME',
    name: 'Income',
    type: 'INCOME',
    color: '#10B981',
    isDefault: true,
    isActive: true,
    sortOrder: 2,
    categories: [{
      id: 'income-0',
      name: 'Income' as Category,
      color: CATEGORY_COLORS['Income'],
      groupType: 'INCOME' as CategoryGroup,
      categoryGroupId: 'INCOME'
    }]
  },
  {
    id: 'TRANSFER',
    name: 'Transfer',
    type: 'TRANSFER',
    color: '#9CA3AF',
    isDefault: true,
    isActive: true,
    sortOrder: 3,
    categories: [
      {
        id: 'transfer-0',
        name: 'Transfer' as Category,
        color: '#9CA3AF',
        groupType: 'TRANSFER' as CategoryGroup,
        categoryGroupId: 'TRANSFER'
      }
    ]
  }
]

interface CategoryManagerProps {
  userId: string
  onCategoryUpdated?: (categories: CategoryGroupData[]) => void
  className?: string
  fallbackToDefaults?: boolean
}

export function CategoryManager({ 
  userId,
  className = '',
  fallbackToDefaults = true
}: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup>('EXPENSE')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6B7280')
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<CategoryGroupType>('CUSTOM')
  const [newGroupColor, setNewGroupColor] = useState('#6B7280')
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const {
    categories,
    loading: isLoading,
    error,
    refreshCategories
  } = useCategories()
  
  // Convert categories to groups format for display
  const categoryGroups = React.useMemo(() => {
    const groups: CategoryGroupData[] = []
    const expenseGroup: CategoryGroupData = {
      id: 'EXPENSE',
      name: 'Expense',
      type: 'EXPENSE',
      color: '#EF4444',
      isDefault: true,
      isActive: true,
      sortOrder: 1,
      categories: []
    }
    const incomeGroup: CategoryGroupData = {
      id: 'INCOME', 
      name: 'Income',
      type: 'INCOME',
      color: '#10B981',
      isDefault: true,
      isActive: true,
      sortOrder: 2,
      categories: []
    }
    const transferGroup: CategoryGroupData = {
      id: 'TRANSFER',
      name: 'Transfer', 
      type: 'TRANSFER',
      color: '#9CA3AF',
      isDefault: true,
      isActive: true,
      sortOrder: 3,
      categories: []
    }
    
    categories.forEach(cat => {
      const categoryItem: CategoryItem = {
        id: cat.id,
        name: cat.name as Category,
        color: cat.color,
        groupType: cat.group_type as CategoryGroup,
        categoryGroupId: cat.group_type
      }
      
      if (cat.group_type === 'EXPENSE') {
        expenseGroup.categories.push(categoryItem)
      } else if (cat.group_type === 'INCOME') {
        incomeGroup.categories.push(categoryItem)
      } else if (cat.group_type === 'TRANSFER') {
        transferGroup.categories.push(categoryItem)
      }
    })
    
    groups.push(expenseGroup, incomeGroup, transferGroup)
    return groups
  }, [categories])
  
  // Display groups or show fallback loading message
  const displayGroups = categoryGroups.length === 0 && fallbackToDefaults 
    ? DEFAULT_CATEGORY_GROUPS 
    : categoryGroups

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const selectedGroupData = displayGroups.find((g: CategoryGroupData) => g.id === selectedGroup)
      if (!selectedGroupData) {
        console.error('Selected group not found')
        return
      }
      
      await createCategory({
         user_id: userId,
         name: newCategoryName.trim(),
         color: newCategoryColor,
         group_type: selectedGroupData.type === 'CUSTOM' ? 'EXPENSE' : selectedGroupData.type,
         is_custom: true
       })
      
      await refreshCategories()
      setNewCategoryName('')
      setNewCategoryColor('#6B7280')
    } catch (error) {
      console.error('Failed to add category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId)
      await refreshCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleAddNewGroup = async () => {
    if (!newGroupName.trim()) return
    // Group creation not implemented in this simplified version
    console.log('Group creation not implemented')
    setIsNewGroupDialogOpen(false)
  }

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return
    // Group deletion not implemented in this simplified version
    console.log('Group deletion not implemented')
    setIsDeleteDialogOpen(false)
  }

  const openDeleteDialog = (groupId: string) => {
    setDeleteGroupId(groupId)
    setIsDeleteDialogOpen(true)
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
        
        {categoryGroups.length === 0 && isLoading && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-gray-500">Loading categories...</p>
            </div>
          </div>
        )}
        
        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
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

          {/* Category Groups */}
          <div className="space-y-6">
            {displayGroups.map((group) => {
              const groupCategories = group.categories.filter(cat => 
                cat.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              
              return (
                <div key={group.id} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      {group.name}
                    </div>
                    {!group.isDefault && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs px-3 py-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(group.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        DELETE
                      </Button>
                    )}
                  </div>
                  
                  {/* Categories in this group */}
                  <div className="space-y-2">
                    {groupCategories.map((category) => (
                      <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-gray-200 cursor-pointer"
                            style={{ backgroundColor: category.color }}
                            onClick={() => {
                              // Could open color picker here
                            }}
                          />
                          <span className="font-medium text-sm text-gray-900">{category.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {category.isCustom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new category for this group */}
                    {selectedGroup === group.id && (
                      <div className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                        <input
                          type="color"
                          value={newCategoryColor}
                          onChange={(e) => setNewCategoryColor(e.target.value)}
                          className="w-6 h-6 rounded-full border-2 border-gray-200 cursor-pointer"
                        />
                        <Input
                          placeholder="Category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0"
                        />
                        <Button 
                          onClick={handleAddCategory} 
                          size="sm"
                          disabled={!newCategoryName.trim() || isLoading}
                          className="h-8 w-8 p-0"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Create new category button */}
                    {selectedGroup !== group.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGroup(group.id as CategoryGroup)}
                        className="w-full justify-start text-gray-500 hover:text-gray-700 border-2 border-dashed border-gray-300 hover:border-gray-400 h-12"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create new category
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
            
            {/* Add New Group Button at the bottom */}
            <div className="pt-4 border-t">
              <Dialog open={isNewGroupDialogOpen} onOpenChange={setIsNewGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs px-3 py-2 h-10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    NEW GROUP
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Category Group</DialogTitle>
                    <DialogDescription>
                      Add a new category group to organize your categories.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="group-name" className="text-right text-sm font-medium">
                        Name
                      </label>
                      <Input
                        id="group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Group name"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="group-type" className="text-right text-sm font-medium">
                        Type
                      </label>
                      <Select value={newGroupType} onValueChange={(value: CategoryGroupType) => setNewGroupType(value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                          <SelectItem value="TRANSFER">Transfer</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="group-color" className="text-right text-sm font-medium">
                        Color
                      </label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <input
                          id="group-color"
                          type="color"
                          value={newGroupColor}
                          onChange={(e) => setNewGroupColor(e.target.value)}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={newGroupColor}
                          onChange={(e) => setNewGroupColor(e.target.value)}
                          placeholder="#6B7280"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsNewGroupDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddNewGroup}
                      disabled={!newGroupName.trim() || isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Group
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete Category Group</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this category group? This action cannot be undone and will also delete all categories within this group.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteGroup}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Rules Section */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">RULES</div>
              <Button variant="outline" size="sm" className="text-xs px-3 py-1 h-7">
                ADD RULE
              </Button>
            </div>
            <div className="text-sm text-gray-500">No rule found..</div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">TAGS</div>
              <Button variant="outline" size="sm" className="text-xs px-3 py-1 h-7">
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