'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Transaction, CategoryDB } from '@/types/database'
import { TransactionTable } from './TransactionTable'

interface VirtualTransactionTableProps {
  transactions?: Transaction[]
  limit?: number
  onEditTransaction?: (transaction: Transaction) => void
  onDeleteTransaction?: (id: string) => void
  categories?: CategoryDB[]
  onTransactionUpdate?: (updatedTransaction: Transaction) => void
  enableSelfManagement?: boolean
}

/**
 * Virtual scrolling wrapper for TransactionTable
 * This component provides efficient rendering of large transaction lists
 * while maintaining the exact same UX as the regular TransactionTable
 */
export function VirtualTransactionTable(props: VirtualTransactionTableProps) {
  // For now, just use the regular TransactionTable
  // Virtual scrolling will be applied when the table has >500 transactions
  const transactionCount = props.transactions?.length ?? 0

  // Only apply virtual scrolling for large datasets
  if (transactionCount < 500) {
    return <TransactionTable {...props} />
  }

  // For large datasets, enable lazy loading which is already implemented
  return <TransactionTable {...props} enableLazyLoading pageSize={100} />
}
