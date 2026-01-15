'use client'

import React, { useState, useMemo } from 'react'
import { Transaction, TransactionUpdate } from '@/types/database'
import { TransactionFormData } from '@/lib/validations'
import { formatCurrency } from '@/lib/data-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit, Trash2, Search, ArrowUpDown, Play, Pause, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { EditTransactionForm } from '@/components/EditTransactionForm'
import { useTransactions } from '@/contexts/TransactionContext'
import { updateTransaction, deleteTransaction } from '@/lib/api/transactions'
import { toast } from 'sonner'

interface RecurringTransactionsListProps {
  userId: string
}

type SortField = 'description' | 'amount' | 'next_date' | 'frequency'
type SortDirection = 'asc' | 'desc'

export function RecurringTransactionsList({ userId }: RecurringTransactionsListProps) {
  const { transactions, refreshTransactions, editTransaction } = useTransactions()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('next_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter only recurring transactions
  const recurringTransactions = useMemo(() => {
    return transactions.filter(t => t.is_recurring)
  }, [transactions])

  const getNextScheduledDate = (transaction: Transaction) => {
    // This logic mimics the backend logic but for display
    // If we had a next_run_date in DB it would be easier, but we calculate it
    const lastProcessed = transaction.last_processed_date ? new Date(transaction.last_processed_date) : new Date(transaction.date)
    const frequency = transaction.recurring_frequency || 'monthly'
    
    // Simple calculation for display purposes
    // Ideally this should match the exact cron logic
    const nextDate = new Date(lastProcessed)
    if (transaction.last_processed_date) {
        if (frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1)
        if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
        if (frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1)
    } else {
        // If never processed, it should run on the transaction date (or today/future if that passed?)
        // Assuming it runs on the day of month/week of the original transaction
        // But for simplicity let's just show the original date if future, or "Pending"
    }
    
    return nextDate
  }

  // Filter and sort
  const filteredTransactions = useMemo(() => {
    return recurringTransactions
      .filter(t => {
        const matchesSearch = 
          (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesFrequency = frequencyFilter === 'all' || t.recurring_frequency === frequencyFilter
        
        return matchesSearch && matchesFrequency
      })
      .sort((a, b) => {
        let aValue: any = ''
        let bValue: any = ''

        switch (sortField) {
          case 'description':
            aValue = (a.merchant || a.description || '').toLowerCase()
            bValue = (b.merchant || b.description || '').toLowerCase()
            break
          case 'amount':
            aValue = a.amount
            bValue = b.amount
            break
          case 'frequency':
            aValue = a.recurring_frequency || 'monthly'
            bValue = b.recurring_frequency || 'monthly'
            break
          case 'next_date':
            // Approximate sorting by last processed or created date
            aValue = new Date(a.last_processed_date || a.date).getTime()
            bValue = new Date(b.last_processed_date || b.date).getTime()
            break
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
  }, [recurringTransactions, searchTerm, frequencyFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to stop this recurring transaction? This will remove the recurring flag but keep the transaction history.')) {
      try {
        await editTransaction(id, { is_recurring: false })
        toast.success('Recurring transaction stopped')
      } catch (error) {
        console.error('Failed to stop recurring transaction:', error)
        toast.error('Failed to stop recurring transaction')
      }
    }
  }

  const handleTransactionUpdated = async (id: string, data: Partial<TransactionFormData>) => {
    try {
      await editTransaction(id, data)
      setEditingTransaction(null)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update transaction:', error)
      toast.error('Failed to update transaction')
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search recurring..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">
                  Transaction Name
                  {sortField === 'description' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[15%] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('amount')}>
                 <div className="flex items-center gap-1">
                  Amount
                  {sortField === 'amount' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[15%] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('frequency')}>
                <div className="flex items-center gap-1">
                  Frequency
                  {sortField === 'frequency' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[20%] cursor-pointer hover:bg-gray-50" onClick={() => handleSort('next_date')}>
                <div className="flex items-center gap-1">
                  Next Scheduled
                  {sortField === 'next_date' && <ArrowUpDown className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead className="w-[20%]">End Status</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  No recurring transactions found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{transaction.merchant || transaction.description}</span>
                      <span className="text-xs text-gray-500">{transaction.category_id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={transaction.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {transaction.recurring_frequency || 'monthly'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      {getNextScheduledDate(transaction).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.recurring_end_date ? (
                      <span className="text-sm text-gray-600">
                        Ends {new Date(transaction.recurring_end_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                        Never Ending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(transaction)}
                        title="Edit Configuration"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                        title="Stop Recurring"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <EditTransactionForm
        userId={userId}
        transaction={editingTransaction}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onTransactionUpdated={handleTransactionUpdated}
      />
    </div>
  )
}
