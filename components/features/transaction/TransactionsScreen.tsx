'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/contexts/CategoryContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useAllTransactions, useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { EditTransactionForm } from '@/components/features/transaction/EditTransactionForm'
import type { TransactionFormData } from '@/lib/validations'
import { Input } from '@/components/ui/atoms/input'
import type { Transaction } from '@/types/database'
import { filterTransactions, groupByDate, summarize, type TransactionFilters } from '@/lib/transaction-filters'
import { TransactionTypeTabs } from './TransactionTypeTabs'
import { MonthSummaryBar } from './MonthSummaryBar'
import { TransactionGroupedList } from './TransactionGroupedList'
import { TransactionFilterSheet } from './TransactionFilterSheet'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TransactionsScreen() {
  const t = useTranslations('transactions.screen')
  const { user } = useAuth()
  const { transactions, isLoading } = useAllTransactions({ userId: user?.id ?? '' })
  const { update } = useTransactionMutations(user?.id ?? '')
  const { categories, getCategoryName, getCategoryColor } = useCategories()
  const { accounts } = useAccounts()

  const now = new Date()
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'ALL', month: { year: now.getFullYear(), month: now.getMonth() }, search: '', categoryIds: [], accountIds: [],
  })
  const [showSearch, setShowSearch] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const handleTransactionUpdated = async (id: string, data: Partial<TransactionFormData>) => {
    await update({ id, data })
    setEditing(null)
  }

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters])
  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const totals = useMemo(() => summarize(filtered), [filtered])

  const getAccountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? t('noAccount')
  const activeFilterCount = filters.categoryIds.length + filters.accountIds.length + (filters.amountMin != null ? 1 : 0) + (filters.amountMax != null ? 1 : 0)
  const isFiltered = filters.type !== 'ALL' || filters.search !== '' || activeFilterCount > 0
  const resetFilters = () => setFilters((f) => ({ ...f, type: 'ALL', search: '', categoryIds: [], accountIds: [], amountMin: undefined, amountMax: undefined }))

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 pb-28 md:pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl leading-title-3 font-bold text-foreground">{t('title')}</h1>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={t('searchPlaceholder')} onClick={() => setShowSearch((s) => { if (s) setFilters((f) => ({ ...f, search: '' })); return !s })} className="rounded-full p-2 text-muted-foreground hover:bg-muted"><Search className="size-5" /></button>
          <button type="button" aria-label={t('filter.title')} onClick={() => setFilterOpen(true)} className="relative rounded-full p-2 text-muted-foreground hover:bg-muted">
            <SlidersHorizontal className="size-5" />
            {activeFilterCount > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}
          </button>
        </div>
      </header>

      {showSearch && (
        <Input autoFocus placeholder={t('searchPlaceholder')} value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
      )}

      <TransactionTypeTabs value={filters.type} onValueChange={(type) => setFilters((f) => ({ ...f, type }))} />
      <MonthSummaryBar month={filters.month} onMonthChange={(month) => setFilters((f) => ({ ...f, month }))} income={totals.income} expense={totals.expense} />

      <TransactionGroupedList
        groups={groups}
        todayKey={todayKey()}
        getCategoryName={(id) => (id ? getCategoryName(id) : t('uncategorized'))}
        getCategoryColor={(id) => (id ? getCategoryColor(id) : 'hsl(var(--muted-foreground))')}
        getAccountName={getAccountName}
        onSelect={setEditing}
        isLoading={isLoading}
        isFiltered={isFiltered}
        onReset={resetFilters}
      />

      <TransactionFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        filters={filters}
        onApply={(next) => setFilters((f) => ({ ...f, ...next }))}
      />

      <EditTransactionForm transaction={editing} open={editing != null} onOpenChange={(o) => { if (!o) setEditing(null) }} onTransactionUpdated={handleTransactionUpdated} />
    </div>
  )
}
