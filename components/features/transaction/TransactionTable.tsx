'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Transaction, CategoryDB } from '@/types/database'
import { formatCurrency, getTotalBalance, calculateTotalSpending, calculateTotalIncome } from '@/lib/data-utils'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { Edit, Trash2, Search, ArrowUpDown, Filter, Loader2, EllipsisVertical, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/molecules/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/molecules/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/molecules/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/molecules/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/organisms/sheet'
import { useTransactionManager } from '@/hooks/use-transaction-manager'
import { EditTransactionForm } from '@/components/features/transaction/EditTransactionForm'
import { useCategories } from '@/contexts/CategoryContext'
import { useTransactions } from '@/contexts/TransactionContext'
import { useAuth } from '@/contexts/AuthContext'
import { DateRangePicker, DateRange } from '@/components/DateRangePicker'
import { AddTransactionForm } from '@/components/features/transaction/AddTransactionForm'
import { useFilteredTransactions } from '@/hooks/useFilteredTransactions'

interface TransactionTableProps {
  transactions?: Transaction[]
  limit?: number
  onEditTransaction?: (transaction: Transaction) => void
  onDeleteTransaction?: (id: string) => void
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
  categories: propCategories,
  onTransactionUpdate,
  enableSelfManagement = false,
  enableLazyLoading = false,
  pageSize = 50
}: TransactionTableProps) {
  const t = useTranslations('transactions')
  const { user } = useAuth()
  const userId = user?.id || ''
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
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Lazy loading state
  const [displayedCount, setDisplayedCount] = useState(enableLazyLoading ? pageSize : limit)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)
  const tableEndRef = useRef<HTMLDivElement>(null)
  
  // Use shared category context or prop categories
  const { categories: contextCategories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const categories = propCategories || contextCategories
  
  // Self-contained transaction management - always call hooks to follow React rules
  const transactionManager = useTransactionManager({})
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
    if (!categoryId) return 'hsl(var(--muted-foreground))' // Default muted color
    const category = categories.find(cat => cat.id === categoryId)
    return category?.color || 'hsl(var(--muted-foreground))'
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
        <span className="text-sm leading-body-sm truncate">{name}</span>
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
      if (enableSelfManagement && transactionManager) {
        await transactionManager.editTransaction(confirmationDialog.transaction.id, {
          category_id: confirmationDialog.newCategoryId
        })
      } else if (transactionContext) {
        await transactionContext.editTransaction(confirmationDialog.transaction.id, {
          category_id: confirmationDialog.newCategoryId
        })
      }

      if (onTransactionUpdate) {
        onTransactionUpdate({ ...confirmationDialog.transaction, category_id: confirmationDialog.newCategoryId })
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
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg leading-title-5 font-semibold text-foreground">{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {t('loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Remove the early return for empty transactions - always show the full interface

  return (
    <Card className="w-full">
      <CardContent className="p-3 sm:p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center gap-3 mb-4 w-full">
            <h1 className="text-md leading-body-lg font-semibold text-muted-foreground">{t('title')}</h1>
            <div className="flex items-center">
              <AddTransactionForm onSuccess={() => {
                transactionContext?.refreshTransactions?.()
                // Also refresh local manager if enabled
                if (enableSelfManagement && transactionManager) {
                  transactionManager.loadTransactions()
                }
              }}/>
            </div>
          </div>
          
          {/* Filter Controls - Desktop */}
          <div className="hidden lg:flex items-center justify-between mb-4 w-full gap-6">
            <div className="flex items-center gap-3">
              <div className="min-w-0 w-40">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
              <div className="min-w-0 w-40">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full text-xs" size="sm">
                    <SelectValue placeholder={t('allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
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
              <div className="min-w-0 w-40">
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger className="w-full text-xs" size="sm">
                    <SelectValue placeholder={t('allMerchants')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allMerchants')}</SelectItem>
                    {uniqueMerchants.map((merchant) => (
                      <SelectItem key={`merchant-${merchant}`} value={merchant}>
                        {merchant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative min-w-0 w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8 bg-muted/50 border-border w-full"
              />
            </div>
          </div>

          {/* Filter Controls - Mobile/Tablet */}
          <div className="flex lg:hidden items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-muted/50 border-border w-full"
              />
            </div>
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh] w-full">
                <SheetHeader>
                  <SheetTitle>{t('filters')}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm leading-body-sm font-medium">{t('dateRange')}</label>
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm leading-body-sm font-medium">{t('category')}</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('allCategories')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allCategories')}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={`category-mobile-${category.id}`} value={category.id}>
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
                  <div className="space-y-2">
                    <label className="text-sm leading-body-sm font-medium">{t('merchant')}</label>
                    <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('allMerchants')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allMerchants')}</SelectItem>
                        {uniqueMerchants.map((merchant) => (
                          <SelectItem key={`merchant-mobile-${merchant}`} value={merchant}>
                            {merchant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => setIsFilterOpen(false)}>
                    {t('applyFilters')}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Transaction Summary */}
          <div className="hidden sm:block mt-4 text-sm leading-body-sm text-muted-foreground">
             <span className="font-medium">{t('summary.total')}:</span> {filteredTransactions.length} •
             <span className="font-medium">{t('summary.dateRange')}:</span> {(() => {
               if (filteredTransactions.length === 0) return t('summary.noTransactions');
               const dates = filteredTransactions.map(tx => new Date(tx.date)).sort((a, b) => a.getTime() - b.getTime());
               const startDate = dates[0].toLocaleDateString();
               const endDate = dates[dates.length - 1].toLocaleDateString();
               return dates.length === 1 ? startDate : `${startDate} - ${endDate}`;
             })()} •
             <span className="font-medium">{t('summary.totalExpenses')}:</span> <span className="text-destructive">{formatCurrency(calculateTotalSpending(filteredTransactions))}</span> •
             <span className="font-medium">{t('summary.totalIncome')}:</span> <span className="text-success">{formatCurrency(calculateTotalIncome(filteredTransactions))}</span> •
             <span className="font-medium">{t('summary.balance')}:</span> <span className={getTotalBalance(filteredTransactions) >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(getTotalBalance(filteredTransactions))}</span>
           </div>
        </div>
        
        {/* Table */}
        <div className="bg-card rounded-lg border border-border">
          <div className="lg:max-h-[900px] lg:overflow-y-auto">
            <Table>
              <TableHeader className="hidden sm:table-header-group lg:sticky lg:top-0 bg-card z-[5]">
                <TableRow className="border-b border-border">
                  <TableHead
                    className="py-4 px-4 lg:px-6 text-left font-medium text-foreground text-sm leading-body-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-2">
                      {t('columns.merchantDescription')}
                      {sortField === 'description' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="hidden lg:table-cell py-4 px-4 lg:px-6 text-left font-medium text-foreground text-sm leading-body-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-2">
                      {t('columns.category')}
                      {sortField === 'category' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="py-4 px-4 lg:px-6 text-right font-medium text-foreground text-sm leading-body-sm cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {t('columns.amount')}
                      {sortField === 'amount' && (
                        <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="py-4 px-2 lg:px-6 text-center font-medium text-foreground text-sm leading-body-sm w-12 lg:w-auto">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {displayTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    {t('noTransactionsFound')}
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
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={10} className="py-3 px-4 lg:px-6 font-medium text-foreground text-sm leading-body-sm">
                            {formattedDate}
                          </TableCell>
                        </TableRow>

                        {/* Transactions for this date */}
                        {displayedDayTransactions.map((transaction) => (
                          <TableRow key={`transaction-${transaction.id}`} className="border-b border-border hover:bg-muted/50">
                            <TableCell className="py-4 px-4 lg:px-6">
                              <div className="flex items-center gap-3">
                                {/* Category color dot - visible on mobile/tablet */}
                                <div
                                  className="w-5 h-5 rounded-md flex-shrink-0 lg:hidden"
                                  style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                                />
                                <span className="text-sm leading-body-sm font-medium text-foreground truncate">
                                  {transaction.merchant || transaction.description || 'No description'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4 px-4 lg:px-6">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                                />
                                <span className="text-sm leading-body-sm text-foreground">
                                  {getCategoryName(transaction.category_id)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-4 lg:px-6 text-right whitespace-nowrap">
                              <div className={`text-sm leading-body-sm font-medium ${
                                transaction.type === 'INCOME'
                                  ? 'text-success'
                                  : 'text-foreground'
                              }`}>
                                {transaction.type === 'INCOME' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-4 px-2 lg:px-6">
                              <div className="flex items-center justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (onEditTransaction) {
                                          onEditTransaction(transaction)
                                        } else if (enableSelfManagement) {
                                          setEditingTransaction(transaction)
                                          // Defer Sheet open until DropdownMenu's DismissableLayer
                                          // has fully unmounted. Without this, Radix sets
                                          // pointer-events:none on the Sheet content because the
                                          // layers context still contains the DropdownMenu node on
                                          // the Sheet's first render.
                                          setTimeout(() => setIsEditModalOpen(true), 0)
                                        }
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      {t('actions.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteTransactionClick(transaction)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {t('actions.delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('loadingMore')}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={loadMoreTransactions}
                      className="text-sm"
                    >
                      {t('loadMore', { remaining: filteredTransactions.length - displayedCount })}
                    </Button>
                  )}
                </div>
              )}
              
              {displayedCount >= filteredTransactions.length && filteredTransactions.length > 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm leading-body-sm">
                  {t('allLoaded', { total: filteredTransactions.length })}
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
            <DialogTitle>{t('confirmCategoryChange.title')}</DialogTitle>
            <DialogDescription>
              {t('confirmCategoryChange.description', {
                description: confirmationDialog?.transaction.description ?? '',
                category: confirmationDialog?.newCategoryName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmationDialog(null)}
              disabled={isUpdating}
            >
              {t('confirmCategoryChange.cancel')}
            </Button>
            <Button
              onClick={confirmCategoryChange}
              disabled={isUpdating}
            >
              {isUpdating ? t('confirmCategoryChange.updating') : t('confirmCategoryChange.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmDialog} onOpenChange={() => setDeleteConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete.title')}</DialogTitle>
            <DialogDescription>
              {t('confirmDelete.description')}
              <br /><br />
              <strong>{t('confirmDelete.details')}</strong>
              <br />{t('confirmDelete.merchantLabel')}: {deleteConfirmDialog?.transaction.merchant}
              <br />{t('confirmDelete.amountLabel')}: {deleteConfirmDialog?.transaction.amount ? formatCurrency(deleteConfirmDialog.transaction.amount) : t('confirmDelete.notAvailable')}
              <br />{t('confirmDelete.dateLabel')}: {deleteConfirmDialog?.transaction.date ? new Date(deleteConfirmDialog.transaction.date).toLocaleDateString() : t('confirmDelete.notAvailable')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmDialog(null)}
              disabled={isDeleting}
            >
              {t('confirmDelete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTransaction}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('confirmDelete.deleting')}
                </>
              ) : (
                t('confirmDelete.delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Transaction Modal for self-management */}
      {enableSelfManagement && (
        <EditTransactionForm
          transaction={editingTransaction}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onTransactionUpdated={handleTransactionUpdated}
          onSuccess={() => {
            transactionContext?.refreshTransactions?.()
            if (enableSelfManagement && transactionManager) {
              transactionManager.loadTransactions()
            }
          }}
        />
      )}
    </Card>
  )
}
