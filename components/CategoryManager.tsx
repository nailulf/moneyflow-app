'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Settings, Search, X, Loader2, Trash2, Pencil, Check } from 'lucide-react'
import { CategoryGroupDB, CategoryDB } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { SEMANTIC_COLORS } from '@/lib/constants'
import { useAutoRefresh } from '@/hooks/useDataRefresh'
import { Analytics } from '@/lib/analytics/amplitude'

interface CategoryManagerProps {
  onCategoryUpdated?: () => void
  className?: string
}

interface DisplayGroup {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'
  color: string
  isDefault: boolean
  categories: CategoryDB[]
}

// Internal component that contains all the logic
function CategoryManagerInternal({
  onCategoryUpdated,
  className = ''
}: CategoryManagerProps) {
  const { user } = useAuth()
  const userId = user?.id || ''
  const { onCategoryChange } = useAutoRefresh(userId)
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(SEMANTIC_COLORS[0].value)
  const [isNewGroupDialogOpen, setIsNewGroupDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM'>('EXPENSE')
  const [newGroupColor, setNewGroupColor] = useState(SEMANTIC_COLORS[0].value)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  
  // Data states
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupDB[]>([])
  const [categories, setCategories] = useState<CategoryDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch category groups
  const fetchCategoryGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/category-groups?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch category groups')
      }
      const data = await response.json()
      setCategoryGroups(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching category groups:', err)
      setError('Failed to load category groups')
      setCategoryGroups([]) // Set empty array as fallback
    }
  }, [userId])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/categories?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError('Failed to load categories')
      setCategories([]) // Set empty array as fallback
    }
  }, [userId])

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchCategoryGroups(), fetchCategories()])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchCategoryGroups, fetchCategories])

  // Load data on mount
  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId, loadData])

  // Create display groups by mapping categories to their groups
  const displayGroups: DisplayGroup[] = React.useMemo(() => {
    const groups: DisplayGroup[] = []
    
    // Add category groups
    categoryGroups.forEach(group => {
      const groupCategories = categories.filter(cat => 
        cat.category_group_id === group.id
      )
      
      groups.push({
        id: group.id,
        name: group.name,
        type: group.type,
        color: group.color,
        isDefault: group.is_default,
        categories: groupCategories
      })
    })
    
    // Add categories without category_group_id, grouped by type
    const orphanCategories = categories.filter(cat => !cat.category_group_id)
    const typeGroups = orphanCategories.reduce((acc, cat) => {
      const type = cat.group_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(cat)
      return acc
    }, {} as Record<string, CategoryDB[]>)
    
    Object.entries(typeGroups).forEach(([type, cats]) => {
      // Check if we already have a group for this type
      const existingGroup = groups.find(g => g.type === type)
      if (existingGroup) {
        existingGroup.categories.push(...cats)
      } else {
        groups.push({
          id: `type-${type.toLowerCase()}`,
          name: type.charAt(0) + type.slice(1).toLowerCase(),
          type: type as 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM',
          color: type === 'EXPENSE' ? 'hsl(var(--destructive))' : type === 'INCOME' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))',
          isDefault: true,
          categories: cats
        })
      }
    })
    
    return groups.sort((a, b) => {
      const order = { 'EXPENSE': 1, 'INCOME': 2, 'TRANSFER': 3, 'CUSTOM': 4 }
      return (order[a.type] || 5) - (order[b.type] || 5)
    })
  }, [categoryGroups, categories])

  // Create new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !selectedGroupId) return

    setIsSubmitting(true)
    try {
      const selectedGroup = displayGroups.find(g => g.id === selectedGroupId)
      if (!selectedGroup) {
        throw new Error('Selected group not found')
      }
      
      const categoryData = {
        user_id: userId,
        name: newCategoryName.trim(),
        color: newCategoryColor,
        group_type: selectedGroup.type === 'CUSTOM' ? 'EXPENSE' : selectedGroup.type,
        category_group_id: selectedGroup.id.startsWith('type-') ? undefined : selectedGroup.id,
        is_custom: true
      }
      
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      })

      if (!response.ok) {
        throw new Error('Failed to create category')
      }

      const newCategory = await response.json()

      // Track category creation
      Analytics.track('Category Created', {
        category_id: newCategory.id,
        category_name: newCategory.name,
        category_color: newCategory.color,
        group_type: newCategory.group_type,
        source: 'settings'
      })

      await loadData()
      onCategoryChange() // Refresh related data across the app
      onCategoryUpdated?.()
      setNewCategoryName('')
      setNewCategoryColor(SEMANTIC_COLORS[0].value)
      setSelectedGroupId(null)
    } catch (err) {
      console.error('Failed to add category:', err)
      setError('Failed to create category')

      // Track category creation failure
      Analytics.track('Category Creation Failed', {
        category_name: newCategoryName.trim(),
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId)
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/categories?category_id=${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      if (categoryToDelete) {
        // Track category deletion
        Analytics.track('Category Deleted', {
          category_id: categoryToDelete.id,
          category_name: categoryToDelete.name,
          group_type: categoryToDelete.group_type
        })
      }
      await loadData()
      onCategoryChange() // Refresh related data across the app
      onCategoryUpdated?.()
    } catch (err) {
      console.error('Failed to delete category:', err)
      setError('Failed to delete category')

      // Track category deletion failure
      Analytics.track('Category Deletion Failed', {
        category_id: categoryId,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit category name
  const handleStartEdit = (category: CategoryDB) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const handleCancelEdit = () => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleSaveEdit = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return

    const originalCategory = categories.find(c => c.id === editingCategoryId)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCategoryId,
          name: editingCategoryName.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update category')
      }

      if (originalCategory) {
        // Track category update
        Analytics.track('Category Updated', {
          category_id: editingCategoryId,
          old_name: originalCategory.name,
          new_name: editingCategoryName.trim(),
          group_type: originalCategory.group_type
        })
      }
      await loadData()
      onCategoryChange() // Refresh related data across the app
      onCategoryUpdated?.()
      setEditingCategoryId(null)
      setEditingCategoryName('')
    } catch (err) {
      console.error('Failed to update category:', err)
      setError('Failed to update category')

      // Track category update failure
      Analytics.track('Category Update Failed', {
        category_id: editingCategoryId,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Create new category group
  const handleAddNewGroup = async () => {
    if (!newGroupName.trim()) return
    
    setIsSubmitting(true)
    try {
      const groupData = {
        user_id: userId,
        name: newGroupName.trim(),
        type: newGroupType,
        color: newGroupColor,
        is_default: false
      }
      
      const response = await fetch('/api/category-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create category group')
      }

      // Track category group creation
      Analytics.track('Category Group Created', {
        group_name: newGroupName.trim(),
        group_type: newGroupType,
        group_color: newGroupColor
      })

      await loadData()
      onCategoryChange() // Refresh related data across the app
      onCategoryUpdated?.()
      setNewGroupName('')
      setNewGroupType('EXPENSE')
      setNewGroupColor(SEMANTIC_COLORS[0].value)
      setIsNewGroupDialogOpen(false)
    } catch (err) {
      console.error('Failed to add group:', err)
      setError('Failed to create category group')

      // Track category group creation failure
      Analytics.track('Category Group Creation Failed', {
        group_name: newGroupName.trim(),
        group_type: newGroupType,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete category group
  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/category-groups?id=${deleteGroupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category group')
      }

      const deletedGroup = categoryGroups.find(g => g.id === deleteGroupId)
      // Track category group deletion
      Analytics.track('Category Group Deleted', {
        group_id: deleteGroupId,
        group_name: deletedGroup?.name,
        group_type: deletedGroup?.type
      })

      await loadData()
      onCategoryChange() // Refresh related data across the app
      onCategoryUpdated?.()
      setIsDeleteDialogOpen(false)
      setDeleteGroupId(null)
    } catch (err) {
      console.error('Failed to delete group:', err)
      setError('Failed to delete category group')

      // Track category group deletion failure
      Analytics.track('Category Group Deletion Failed', {
        group_id: deleteGroupId,
        error_message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (groupId: string) => {
    const group = categoryGroups.find(g => g.id === groupId)
    setDeleteGroupId(groupId)
    setIsDeleteDialogOpen(true)

    // Track delete group dialog opened
    Analytics.track('Delete Category Group Dialog Opened', {
      group_id: groupId,
      group_name: group?.name,
      trigger: 'group_header'
    })
  }

  const openNewGroupDialog = () => {
    setIsNewGroupDialogOpen(true)

    // Track add group form opened
    Analytics.track('Add Category Group Form Opened', {
      trigger: 'add_button'
    })
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
        
        <div className="mt-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
        
        {loading && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          </div>
        )}
        
        {!loading && (
          <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        {group.name}
                      </div>
                      {!group.isDefault && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs px-3 py-1 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDeleteDialog(group.id)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          DELETE
                        </Button>
                      )}
                    </div>
                    
                    {/* Categories in this group */}
                    <div className="space-y-2">
                      {groupCategories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          {editingCategoryId === category.id ? (
                            // Edit mode
                            <>
                              <div className="flex items-center space-x-3 flex-1">
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-border flex-shrink-0"
                                  style={{ backgroundColor: category.color }}
                                />
                                <Input
                                  value={editingCategoryName}
                                  onChange={(e) => setEditingCategoryName(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit()
                                    if (e.key === 'Escape') handleCancelEdit()
                                  }}
                                  disabled={isSubmitting}
                                />
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  disabled={isSubmitting || !editingCategoryName.trim()}
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-6 h-6 rounded-full border-2 border-border"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium text-sm text-foreground">{category.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(category)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  disabled={isSubmitting}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {category.is_custom && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={isSubmitting}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {/* Add new category for this group */}
                      {selectedGroupId === group.id && (
                        <div className="flex items-center space-x-2 p-3 border-2 border-dashed border-muted rounded-lg">
                          <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                            <SelectTrigger className="w-[60px] h-8 p-1">
                              <div 
                                className="w-full h-full rounded"
                                style={{ backgroundColor: newCategoryColor }}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="grid grid-cols-5 gap-2 p-2">
                                {SEMANTIC_COLORS.map((color) => (
                                  <SelectItem 
                                    key={color.name} 
                                    value={color.value}
                                    className="p-0 h-6 w-6 rounded-full cursor-pointer focus:ring-2 focus:ring-offset-2"
                                    style={{ backgroundColor: color.value }}
                                  >
                                    <span className="sr-only">{color.name}</span>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddCategory()
                              }
                            }}
                          />
                          <Button 
                            onClick={handleAddCategory} 
                            size="sm"
                            disabled={!newCategoryName.trim() || isSubmitting}
                            className="h-8 w-8 p-0"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {/* Create new category button */}
                      {selectedGroupId !== group.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGroupId(group.id)}
                          className="w-full justify-start text-muted-foreground hover:text-foreground border-2 border-dashed border-muted hover:border-muted-foreground/50 h-12"
                          disabled={isSubmitting}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create new category
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {/* Add New Group Button */}
              <div className="pt-4 border-t">
                <Dialog open={isNewGroupDialogOpen} onOpenChange={setIsNewGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs px-3 py-2 h-10"
                      disabled={isSubmitting}
                      onClick={openNewGroupDialog}
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
                        <Select value={newGroupType} onValueChange={(value: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'CUSTOM') => setNewGroupType(value)}>
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
                          <Select value={newGroupColor} onValueChange={setNewGroupColor}>
                            <SelectTrigger className="w-full h-10">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-6 h-6 rounded-full"
                                  style={{ backgroundColor: newGroupColor }}
                                />
                                <span className="text-muted-foreground">
                                  {SEMANTIC_COLORS.find(c => c.value === newGroupColor)?.name || 'Select Color'}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {SEMANTIC_COLORS.map((color) => (
                                <SelectItem key={color.name} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: color.value }}
                                    />
                                    {color.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsNewGroupDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddNewGroup}
                        disabled={!newGroupName.trim() || isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Wrapper component that handles client-side mounting
export function CategoryManager(props: CategoryManagerProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <CategoryManagerInternal {...props} />
}