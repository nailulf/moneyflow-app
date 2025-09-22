'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Transaction, CategoryDB } from '@/types/database'
import { formatCurrency, getTotalBalance, calculateTotalSpending, calculateTotalIncome } from '@/lib/data-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Search, ArrowUpDown, Filter, Loader2 } from 'lucide-react'
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
import { updateTransaction, deleteTransaction } from '@/lib/api/transactions'
import { useTransactionManager } from '@/hooks/use-transaction-manager'
import { EditTransactionForm } from '@/components/EditTransactionForm'
import { useCategories } from '@/contexts/CategoryContext'
import { useTransactions } from '@/contexts/TransactionContext'
import { DateRangePicker, DateRange } from '@/components/DateRangePicker'
import { AddTransactionForm } from './AddTransactionForm'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'

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
  // New props for lazy loading
  enableLazyLoading?: boolean
  pageSize?: number
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
  enableSelfManagement = false,
  enableLazyLoading = false,
  pageSize = 50
}: TransactionTableProps) {
  const [isClient, setIsClient] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [merchantFilter, setMerchantFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const [confirmationDialog, setConfirmationDialog] = useState<CategoryChangeConfirmation | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ transaction: Transaction } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // Lazy loading state
  const [displayedCount, setDisplayedCount] = useState(enableLazyLoading ? pageSize : limit)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const tableEndRef = useRef<HTMLDivElement>(null)
  
  // Use shared category context or prop categories
  const { categories: contextCategories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const categories = propCategories || contextCategories
  
  // Self-contained transaction management - always call hooks to follow React rules
  const transactionManager = useTransactionManager({ userId })
  const transactionContext = useTransactions()
  
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

  const handleDeleteTransactionClick = useCallback(async (transaction: Transaction) => {
    setDeleteConfirmDialog({
      transaction,
    })
  }, [])

  const confirmDeleteTransaction = useCallback(async () => {
    if (!deleteConfirmDialog || isDeleting) return
    
    setIsDeleting(true)
    try {
      await deleteTransaction(deleteConfirmDialog.transaction.id)
      
      if (enableSelfManagement && transactionManager) {
        await transactionManager.removeTransaction(deleteConfirmDialog.transaction.id)
      } else if (transactionContext) {
        await transactionContext.removeTransaction(deleteConfirmDialog.transaction.id)
      }
      
      setDeleteConfirmDialog(null)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConfirmDialog, isDeleting, enableSelfManagement, transactionManager, transactionContext])

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

  const handleTransactionUpdated = useCallback(async (id: string, data: Partial<Transaction>) => {
    try {
      if (enableSelfManagement && transactionManager) {
        await transactionManager.editTransaction(id, data)
      } else if (transactionContext) {
        await transactionContext.editTransaction(id, data)
      }
      
      if (onTransactionUpdate) {
        const updatedTransaction = transactions.find(t => t.id === id)
        if (updatedTransaction) {
          onTransactionUpdate({ ...updatedTransaction, ...data })
        }
      }
      
      setEditingTransaction(null)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update transaction:', error)
    }
  }, [enableSelfManagement, transactionManager, transactionContext, onTransactionUpdate, transactions])

  // Get unique merchants for filter dropdown
  const uniqueMerchants = useMemo(() => {
    const merchants = transactions
      .map(t => t.merchant)
      .filter((merchant): merchant is string => Boolean(merchant))
      .filter((merchant, index, arr) => arr.indexOf(merchant) === index)
      .sort()
    return merchants
  }, [transactions])

  // Group transactions by date for display
  const { filteredTransactions, displayTransactions, groupedTransactions } = useMemo(() => {
    const filtered = transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.merchant && transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = categoryFilter === 'all' || transaction.category_id === categoryFilter
      
      const matchesMerchant = merchantFilter === 'all' || transaction.merchant === merchantFilter
      
      const matchesDateRange = (() => {
        if (!dateRange.startDate && !dateRange.endDate) return true
        const transactionDate = new Date(transaction.date)
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null
        
        if (startDate && transactionDate < startDate) return false
        if (endDate && transactionDate > endDate) return false
        return true
      })()
      
      return matchesSearch && matchesCategory && matchesMerchant && matchesDateRange
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
          aValue = Math.abs(a.amount)
          bValue = Math.abs(b.amount)
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

    // Group transactions by date
    const grouped = filtered.reduce((groups, transaction) => {
      const date = new Date(transaction.date).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
      return groups
    }, {} as Record<string, Transaction[]>)

    const displayed = enableLazyLoading ? filtered.slice(0, displayedCount) : filtered.slice(0, limit)
    
    return { filteredTransactions: filtered, displayTransactions: displayed, groupedTransactions: grouped }
  }, [transactions, searchTerm, categoryFilter, merchantFilter, dateRange, sortField, sortDirection, limit, displayedCount, enableLazyLoading, getCategoryName])

  // Reset displayed count when filters change
  useEffect(() => {
    if (enableLazyLoading) {
      setDisplayedCount(pageSize)
    }
  }, [searchTerm, categoryFilter, merchantFilter, dateRange, sortField, sortDirection, pageSize, enableLazyLoading])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!enableLazyLoading || !tableEndRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoadingMore && displayedCount < filteredTransactions.length) {
          setIsLoadingMore(true)
          // Simulate loading delay for better UX
          setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + pageSize, filteredTransactions.length))
            setIsLoadingMore(false)
          }, 300)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    observer.observe(tableEndRef.current)

    return () => {
      observer.disconnect()
    }
  }, [enableLazyLoading, isLoadingMore, displayedCount, filteredTransactions.length, pageSize])

  const loadMoreTransactions = useCallback(() => {
    if (isLoadingMore || displayedCount >= filteredTransactions.length) return
    
    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + pageSize, filteredTransactions.length))
      setIsLoadingMore(false)
    }, 300)
  }, [isLoadingMore, displayedCount, filteredTransactions.length, pageSize])
  
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
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center gap-3 mb-4 w-full">
            <h1 className="text-md font-semibold text-gray-500">TRANSACTIONS</h1>
            <div className="flex items-center">
              <AddTransactionForm userId={userId} onSuccess={() => {
                transactionContext?.refreshTransactions?.()
              }}/>
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center justify-between mb-4 w-full gap-6">
            {/* Left-aligned Filter Group */}
            <div className="flex items-center gap-3">
              {/* Date Range Filter */}
              <div className="min-w-0 w-40">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
              
              {/* Category Filter */}
              <div className="min-w-0 w-40">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full text-xs" size="sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={`category-${category.id}`} value={category.id}>
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
              </div>
              
              {/* Merchant Filter */}
              <div className="min-w-0 w-40">
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger className="w-full text-xs" size="sm">
                    <SelectValue placeholder="All Merchants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Merchants</SelectItem>
                    {uniqueMerchants.map((merchant) => (
                      <SelectItem key={`merchant-${merchant}`} value={merchant}>
                        {merchant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Right-aligned Search Bar */}
            <div className="relative min-w-0 w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8 bg-gray-50 border-gray-200 w-full"
              />
            </div>
          </div>
          
          {/* Transaction Summary */}
           <div className="mt-4 text-sm text-gray-600">
             <span className="font-medium">Total transactions:</span> {filteredTransactions.length} • 
             <span className="font-medium">Date range:</span> {(() => {
               if (filteredTransactions.length === 0) return 'No transactions';
               const dates = filteredTransactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
               const startDate = dates[0].toLocaleDateString();
               const endDate = dates[dates.length - 1].toLocaleDateString();
               return dates.length === 1 ? startDate : `${startDate} - ${endDate}`;
             })()} • 
             <span className="font-medium">Total expenses:</span> <span className="text-red-600">{formatCurrency(calculateTotalSpending(filteredTransactions))}</span> • 
             <span className="font-medium">Total income:</span> <span className="text-green-600">{formatCurrency(calculateTotalIncome(filteredTransactions))}</span> • 
             <span className="font-medium">Balance:</span> <span className={getTotalBalance(filteredTransactions) >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(getTotalBalance(filteredTransactions))}</span>
           </div>
        </div>
        
        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="max-h-[900px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-[5]">
                <TableRow className="border-b border-gray-200">
                  <TableHead 
                    className="py-4 px-6 text-left font-medium text-gray-700 text-sm cursor-pointer hover:bg-gray-50 w-[40%]"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-2">
                      Merchant / Description
                      {sortField === 'description' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="py-4 px-6 text-left font-medium text-gray-700 text-sm cursor-pointer hover:bg-gray-50 w-[25%]"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-2">
                      Category
                      {sortField === 'category' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="py-4 px-6 text-right font-medium text-gray-700 text-sm cursor-pointer hover:bg-gray-50 w-[20%]"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Amount
                      {sortField === 'amount' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="py-4 px-6 text-center font-medium text-gray-700 text-sm w-[15%]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {displayTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedTransactions)
                  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                  .filter(([dateString, dayTransactions]) => {
                    const displayedDayTransactions = dayTransactions.filter(t => 
                      displayTransactions.includes(t)
                    )
                    return displayedDayTransactions.length > 0
                  })
                  .map(([dateString, dayTransactions]) => {
                    const displayedDayTransactions = dayTransactions.filter(t => 
                      displayTransactions.includes(t)
                    )
                    
                    const formattedDate = new Date(dateString).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                    
                    return (
                      <React.Fragment key={`date-${dateString}`}>
                        {/* Date Header Row */}
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={4} className="py-3 px-6 font-medium text-gray-700 text-sm">
                            {formattedDate}
                          </TableCell>
                        </TableRow>
                        
                        {/* Transactions for this date */}
                        {displayedDayTransactions.map((transaction) => (
                          <TableRow key={`transaction-${transaction.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                            <TableCell className="py-4 px-6 w-[40%]">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {transaction.merchant || transaction.description || 'No description'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6 w-[25%]">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                                />
                                <span className="text-sm text-gray-900">
                                  {getCategoryName(transaction.category_id)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-right w-[20%]">
                              <div className={`text-sm font-medium ${
                                transaction.type === 'INCOME' 
                                  ? 'text-green-600'
                                  : 'text-gray-900'
                              }`}>
                                {transaction.type === 'INCOME' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6 w-[15%]">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (onEditTransaction) {
                                      onEditTransaction(transaction)
                                    } else if (enableSelfManagement) {
                                      setEditingTransaction(transaction)
                                      setIsEditModalOpen(true)
                                    }
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTransactionClick(transaction)}
                                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 text-gray-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })
              )}
              </TableBody>
            </Table>
          </div>
          
          {/* Infinite scroll trigger and loading indicator */}
          {enableLazyLoading && (
            <div className="mt-4">
              {displayedCount < filteredTransactions.length && (
                <div ref={tableEndRef} className="flex justify-center py-4">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more transactions...</span>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={loadMoreTransactions}
                      className="text-sm"
                    >
                      Load More ({filteredTransactions.length - displayedCount} remaining)
                    </Button>
                  )}
                </div>
              )}
              
              {displayedCount >= filteredTransactions.length && filteredTransactions.length > 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  All transactions loaded ({filteredTransactions.length} total)
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmDialog} onOpenChange={() => setDeleteConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
              <br /><br />
              <strong>Transaction Details:</strong>
              <br />Merchant: {deleteConfirmDialog?.transaction.merchant}
              <br />Amount: {deleteConfirmDialog?.transaction.amount ? formatCurrency(deleteConfirmDialog.transaction.amount) : 'N/A'}
              <br />Date: {deleteConfirmDialog?.transaction.date ? new Date(deleteConfirmDialog.transaction.date).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDialog(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTransaction}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Transaction'
              )}
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
    </Card>
  )
}