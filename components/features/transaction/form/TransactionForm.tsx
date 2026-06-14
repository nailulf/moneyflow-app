'use client'

import { useState } from 'react'
import { ChevronRight, Calendar, FileText, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type FormState,
  type TxnType,
  amountReducer,
  formatAmountDisplay,
  fieldsForType,
  reconcileOnTypeChange,
  isFormValid,
  buildTransactionPayload,
} from '@/lib/transaction-form'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { AmountKeypad } from '@/components/features/transaction/form/AmountKeypad'
import { RecurringFields } from '@/components/features/transaction/form/RecurringFields'
import { CategoryPickerSheet } from '@/components/features/transaction/form/CategoryPickerSheet'
import { AccountPickerSheet } from '@/components/features/transaction/form/AccountPickerSheet'
import { TransactionSuccessView, type TransactionSummary } from '@/components/features/transaction/form/TransactionSuccessView'
import { useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { useCategories } from '@/hooks/use-category-manager'
import { useAccounts } from '@/contexts/AccountContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionFormProps {
  mode: 'create' | 'edit'
  userId: string
  /** Pre-seed values for edit mode; also accepts `id` for targeting the existing record. */
  initial?: Partial<FormState> & { id?: string }
  onDone: () => void
}

type Phase = 'form' | 'success'

const TYPE_OPTIONS: Array<{ value: TxnType; label: string }> = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildDefaultState(
  initial?: Partial<FormState>,
): FormState {
  const base: FormState = {
    type: 'EXPENSE',
    amount: { digits: '' },
    categoryId: null,
    accountId: null,
    toAccountId: null,
    note: '',
    date: todayString(),
    currency: 'IDR',
    isRecurring: false,
    recurringFrequency: null,
    recurringEndDate: null,
  }
  return initial ? { ...base, ...initial } : base
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionForm({ mode, userId, initial, onDone }: TransactionFormProps) {
  const { create, update, isCreating, isUpdating } = useTransactionMutations(userId)
  const { categories } = useCategories()
  const { accounts } = useAccounts()

  // Core form state
  const [state, setState] = useState<FormState>(() =>
    buildDefaultState(initial)
  )

  // Phase: 'form' while editing, 'success' after a successful save
  const [phase, setPhase] = useState<Phase>('form')
  const [savedSummary, setSavedSummary] = useState<TransactionSummary | null>(null)

  // Validation error flag (inline)
  const [showValidation, setShowValidation] = useState(false)

  // Picker open states
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [toAccountOpen, setToAccountOpen] = useState(false)

  // Derived
  const fields = fieldsForType(state.type)
  const pending = mode === 'create' ? isCreating : isUpdating

  // Resolve display names
  const selectedCategory = categories.find((c) => c.id === state.categoryId)
  const selectedAccount = accounts.find((a) => a.id === state.accountId)
  const selectedToAccount = accounts.find((a) => a.id === state.toAccountId)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleTypeChange(next: TxnType) {
    setState((prev) => reconcileOnTypeChange(prev, next))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid(state)) {
      setShowValidation(true)
      return
    }
    setShowValidation(false)

    const payload = buildTransactionPayload(state, mode, userId)
    const insert = {
      ...payload,
      category_id: payload.category_id ?? undefined,
      account_id: payload.account_id ?? undefined,
      to_account_id: payload.to_account_id ?? undefined,
      // TransactionPayload.recurring_frequency is typed as `string | null` (too broad);
      // FormState guarantees RecurringFrequency | null so the cast is safe.
      recurring_frequency: payload.recurring_frequency as 'daily' | 'weekly' | 'monthly' | 'yearly' | null,
    }

    try {
      if (mode === 'create') {
        await create(insert)
      } else if (initial?.id) {
        await update({ id: initial.id, data: insert })
      }
    } catch {
      // useTransactionMutations already shows an error toast via its onError handler
      return
    }

    // Build summary for success view (only reached on success)
    const summary: TransactionSummary = {
      type: state.type,
      amount: payload.amount,
      categoryName: selectedCategory?.name ?? null,
      accountName: selectedAccount?.name ?? null,
      toAccountName: selectedToAccount?.name ?? null,
      date: state.date,
      currency: state.currency,
    }
    setSavedSummary(summary)
    setPhase('success')
  }

  function handleAddAnother() {
    setState(buildDefaultState())
    setShowValidation(false)
    setPhase('form')
  }

  function handleAccountSelect(id: string) {
    const acct = accounts.find((a) => a.id === id)
    setState((prev) => ({
      ...prev,
      accountId: id,
      currency: acct?.currency ?? prev.currency,
    }))
  }

  // ---------------------------------------------------------------------------
  // Success view
  // ---------------------------------------------------------------------------

  if (phase === 'success' && savedSummary) {
    return (
      <TransactionSuccessView
        mode={mode}
        summary={savedSummary}
        onDone={onDone}
        onAddAnother={handleAddAnother}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Form view
  // ---------------------------------------------------------------------------

  return (
    <form
      id="txn-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-5 py-4"
    >
      {/* Header */}
      <CreateFlowHeader
        title={mode === 'create' ? 'Add transaction' : 'Edit transaction'}
        onBack={onDone}
        backLabel="Back"
        formId="txn-form"
        saveLabel="Save"
        pending={pending}
      />

      {/* Type segmented control */}
      <SegmentedControl<TxnType>
        options={TYPE_OPTIONS}
        value={state.type}
        onChange={handleTypeChange}
      />

      {/* Amount display */}
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="text-xs leading-caption text-muted-foreground uppercase tracking-wide">
          {state.currency}
        </span>
        <p
          className={cn(
            'text-4xl leading-title-1 font-bold tabular-nums',
            state.type === 'INCOME' ? 'text-success' : state.type === 'EXPENSE' ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatAmountDisplay(state.amount)}
        </p>
        {showValidation && !state.amount.digits && (
          <p className="text-xs leading-caption text-destructive">Enter an amount</p>
        )}
      </div>

      {/* Field rows */}
      <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card overflow-hidden">
        {/* Category row (not shown for TRANSFER) */}
        {fields.category && (
          <>
            <button
              type="button"
              onClick={() => setCategoryOpen(true)}
              className={cn(
                'flex h-[52px] items-center gap-3 px-4',
                'text-left transition-colors hover:bg-muted/50 active:bg-muted',
                showValidation && !state.categoryId && 'text-destructive',
              )}
            >
              <span className="flex-1 text-md leading-body-lg text-foreground">
                {selectedCategory ? selectedCategory.name : (
                  <span className="text-muted-foreground">Choose category</span>
                )}
              </span>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
            <div className="h-px bg-border mx-4" />
          </>
        )}

        {/* Account row (From account for TRANSFER) */}
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className={cn(
            'flex h-[52px] items-center gap-3 px-4',
            'text-left transition-colors hover:bg-muted/50 active:bg-muted',
            showValidation && !state.accountId && 'text-destructive',
          )}
        >
          <span className="flex-1 text-md leading-body-lg text-foreground">
            {selectedAccount ? selectedAccount.name : (
              <span className="text-muted-foreground">
                {fields.toAccount ? 'From account' : 'Choose account'}
              </span>
            )}
          </span>
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </button>

        {/* To account row (TRANSFER only) */}
        {fields.toAccount && (
          <>
            <div className="h-px bg-border mx-4" />
            <button
              type="button"
              onClick={() => setToAccountOpen(true)}
              className={cn(
                'flex h-[52px] items-center gap-3 px-4',
                'text-left transition-colors hover:bg-muted/50 active:bg-muted',
                showValidation && !state.toAccountId && 'text-destructive',
              )}
            >
              <span className="flex-1 text-md leading-body-lg text-foreground">
                {selectedToAccount ? selectedToAccount.name : (
                  <span className="text-muted-foreground">To account</span>
                )}
              </span>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </button>
          </>
        )}

        {/* Date row */}
        <div className="h-px bg-border mx-4" />
        <label className="flex h-[52px] items-center gap-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
          <Calendar className="size-4 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={state.date}
            onChange={(e) => setState((prev) => ({ ...prev, date: e.target.value }))}
            className="flex-1 bg-transparent text-md leading-body-lg text-foreground focus:outline-none"
          />
        </label>

        {/* Note row */}
        <div className="h-px bg-border mx-4" />
        <label className="flex h-[52px] items-center gap-3 px-4">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Add note…"
            value={state.note}
            onChange={(e) => setState((prev) => ({ ...prev, note: e.target.value }))}
            className={cn(
              'flex-1 bg-transparent text-md leading-body-lg text-foreground',
              'placeholder:text-muted-foreground focus:outline-none',
            )}
          />
        </label>

        {/* Repeat toggle */}
        <div className="h-px bg-border mx-4" />
        <div className="flex h-[52px] items-center gap-3 px-4">
          <Repeat className="size-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-md leading-body-lg text-foreground">Repeat</span>
          <button
            type="button"
            role="switch"
            aria-checked={state.isRecurring}
            onClick={() =>
              setState((prev) => ({
                ...prev,
                isRecurring: !prev.isRecurring,
                recurringFrequency: !prev.isRecurring && prev.recurringFrequency === null ? 'monthly' : prev.recurringFrequency,
              }))
            }
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              state.isRecurring ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-card transition-transform',
                state.isRecurring ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>
      </div>

      {/* Recurring fields (only when ON) */}
      {state.isRecurring && (
        <RecurringFields
          frequency={state.recurringFrequency ?? 'monthly'}
          endDate={state.recurringEndDate}
          onChange={({ frequency, endDate }) =>
            setState((prev) => ({ ...prev, recurringFrequency: frequency, recurringEndDate: endDate }))
          }
        />
      )}

      {/* Amount keypad */}
      <AmountKeypad
        onKey={(action) =>
          setState((prev) => ({ ...prev, amount: amountReducer(prev.amount, action) }))
        }
      />

      {/* Pickers */}
      {fields.category && (
        <CategoryPickerSheet
          open={categoryOpen}
          type={state.type}
          categories={categories}
          selectedId={state.categoryId}
          onSelect={(id) => setState((prev) => ({ ...prev, categoryId: id }))}
          onOpenChange={setCategoryOpen}
        />
      )}

      <AccountPickerSheet
        open={accountOpen}
        title={fields.toAccount ? 'From' : 'Account'}
        accounts={accounts}
        selectedId={state.accountId}
        onSelect={handleAccountSelect}
        onOpenChange={setAccountOpen}
      />

      {fields.toAccount && (
        <AccountPickerSheet
          open={toAccountOpen}
          title="To"
          accounts={accounts}
          selectedId={state.toAccountId}
          excludeId={state.accountId}
          onSelect={(id) => setState((prev) => ({ ...prev, toAccountId: id }))}
          onOpenChange={setToAccountOpen}
        />
      )}
    </form>
  )
}
