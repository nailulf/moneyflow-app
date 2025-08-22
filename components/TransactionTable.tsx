'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Transaction, CategoryDB } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Search, ArrowUpDown, Filter } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateTransaction } from '@/lib/api/transactions'
import { useTransactionManager } from '@/hooks/use-transaction-manager'
import { EditTransactionForm } from '@/components/EditTransactionForm'
import { useCategories } from '@/contexts/CategoryContext'
import { useTransactions } from '@/contexts/TransactionContext'

interface TransactionTableProps {
  transactions?: Transaction[]
  limit?: number
  onEditTransaction?: (transaction: Transaction) => void
  onDeleteTransaction?: (id: string) => void
  userId: string
  categories?: CategoryDB[]
  onTransactionUpdate?: (updatedTransaction: Transaction) => void
  // New prop to enable self-contained transaction management
  enableSelfManagement?: boolean
}

type SortField = 'date' | 'description' | 'category' | 'amount' | 'merchant'
type SortDirection = 'asc' | 'desc'

interface CategoryChangeConfirmation {
  transaction: Transaction
  newCategoryId: string
  newCategoryName: string
}

export function TransactionTable({ 
  transactions: propTransactions, 
  limit = 10, 
  onEditTransaction, 
  onDeleteTransaction,
  userId,
  categories: propCategories,
  onTransactionUpdate,
  enableSelfManagement = false
}: TransactionTableProps) {
  const [isClient, setIsClient] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [confirmationDialog, setConfirmationDialog] = useState<CategoryChangeConfirmation | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Use shared category context or prop categories
  const { categories: contextCategories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const categories = propCategories || contextCategories
  
  // Self-contained transaction management - always call hooks to follow React rules
  const transactionManager = useTransactionManager({ userId })
  const transactionContext = useTransactions()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // Use either prop transactions or context transactions when self-managing
  const transactions = useMemo(() => {
    return propTransactions || (enableSelfManagement ? transactionContext?.transactions : transactionManager?.transactions) || []
  }, [propTransactions, enableSelfManagement, transactionContext?.transactions, transactionManager?.transactions])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Separate effect for transaction loading to avoid dependency issues
  useEffect(() => {
    if (enableSelfManagement && !propTransactions && transactionManager && userId) {
      // Only load if we're not using the shared context (which auto-loads)
      if (!transactionContext) {
        transactionManager.loadTransactions()
      }
    }
  }, [enableSelfManagement, userId, propTransactions, transactionContext, transactionManager])



  // Transaction management handlers (moved from spending page)
  const handleEditTransaction = (transaction: Transaction) => {
    if (onEditTransaction) {
      onEditTransaction(transaction)
    } else if (enableSelfManagement) {
      setEditingTransaction(transaction)
      setIsEditModalOpen(true)
    }
  }

  const handleTransactionUpdated = async (id: string, data: Partial<Transaction>) => {
    if (enableSelfManagement && transactionManager) {
      await transactionManager.editTransaction(id, data)
      setIsEditModalOpen(false)
      setEditingTransaction(null)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (onDeleteTransaction) {
      onDeleteTransaction(id)
    } else if (enableSelfManagement && transactionManager) {
      try {
        await transactionManager.removeTransaction(id)
      } catch (error) {
        console.error('Failed to delete transaction:', error)
      }
    }
  }

  const getCategoryName = useCallback((categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized'
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'Unknown Category'
  }, [categories])

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return '#6B7280' // Default gray color
    const category = categories.find(cat => cat.id === categoryId)
    return category?.color || '#6B7280'
  }

  const renderCategoryWithColor = (categoryId: string | null) => {
    const name = getCategoryName(categoryId)
    const color = getCategoryColor(categoryId)
    
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
        <span className="text-sm truncate">{name}</span>
      </div>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleCategoryChange = (transaction: Transaction, newCategoryId: string) => {
    const newCategoryName = getCategoryName(newCategoryId)
    setConfirmationDialog({
      transaction,
      newCategoryId,
      newCategoryName
    })
  }

  const confirmCategoryChange = async () => {
    if (!confirmationDialog) return
    
    setIsUpdating(true)
    try {
      const updatedTransaction = await updateTransaction(confirmationDialog.transaction.id, {
        category_id: confirmationDialog.newCategoryId
      })
      
      if (onTransactionUpdate) {
        onTransactionUpdate(updatedTransaction)
      }
      
      setConfirmationDialog(null)
    } catch (error) {
      console.error('Failed to update transaction category:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const displayTransactions = useMemo(() => {
    const filtered = transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.merchant && transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = categoryFilter === 'all' || transaction.category_id === categoryFilter
      
      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date)
          bValue = new Date(b.date)
          break
        case 'description':
          aValue = a.description.toLowerCase()
          bValue = b.description.toLowerCase()
          break
        case 'category':
          aValue = getCategoryName(a.category_id).toLowerCase()
          bValue = getCategoryName(b.category_id).toLowerCase()
          break
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'merchant':
          aValue = (a.merchant || '').toLowerCase()
          bValue = (b.merchant || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered.slice(0, limit)
  }, [transactions, searchTerm, categoryFilter, sortField, sortDirection, limit, getCategoryName])
  
  if (!isClient) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Remove the early return for empty transactions - always show the full interface

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Transactions</CardTitle>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={categoriesLoading}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Filter by category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                  ) : categoriesError ? (
                    <SelectItem value="error" disabled>Error loading categories</SelectItem>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200">
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                    <div
                      onClick={() => handleSort('date')}
                      className="cursor-pointer inline-flex items-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      Date
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                    <div
                      onClick={() => handleSort('description')}
                      className="cursor-pointer inline-flex items-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      Description
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                    <div
                      onClick={() => handleSort('merchant')}
                      className="cursor-pointer inline-flex items-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      Merchant
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                    <div
                      onClick={() => handleSort('category')}
                      className="cursor-pointer inline-flex items-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      Category
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                    <div
                      onClick={() => handleSort('amount')}
                      className="cursor-pointer inline-flex items-center font-medium text-gray-600 hover:text-gray-900"
                    >
                      Amount
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-s font-medium text-gray-600 py-2">
                      Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <div className="text-gray-500">
                        {transactions.length === 0 ? 'No transactions found. Add your first transaction to get started!' : 'No transactions match your search criteria.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayTransactions.map((transaction) => {
                    return (
                      <TableRow key={transaction.id} className="border-gray-100 hover:bg-gray-50">
                        <TableCell className="py-3">
                          <div className="text-xs text-gray-900">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs text-gray-900">
                            {transaction.description || 'No description'}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs text-gray-900">
                            {transaction.merchant || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Select
                            value={transaction.category_id || 'uncategorized'}
                            onValueChange={(value) => handleCategoryChange(transaction, value)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue>
                                {renderCategoryWithColor(transaction.category_id)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="uncategorized">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                                  <span>Uncategorized</span>
                                </div>
                              </SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: category.color }}
                                    />
                                    <span>{category.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className={`text-xs ${
                            transaction.type === 'INCOME' 
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }`}>
                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex justify-end gap-1">
                            {(onEditTransaction || enableSelfManagement) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(transaction)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {(onDeleteTransaction || enableSelfManagement) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Change Confirmation Dialog */}
      <Dialog open={!!confirmationDialog} onOpenChange={() => setConfirmationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Category Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the category for &quot;{confirmationDialog?.transaction.description}&quot; to &quot;{confirmationDialog?.newCategoryName}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmationDialog(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCategoryChange}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Transaction Modal for self-management */}
      {enableSelfManagement && (
        <EditTransactionForm
          userId={userId}
          transaction={editingTransaction}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onTransactionUpdated={handleTransactionUpdated}
        />
      )}
    </>
  )
}