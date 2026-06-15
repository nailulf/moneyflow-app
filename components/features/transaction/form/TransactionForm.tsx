'use client'

import { useState } from 'react'
import { ChevronRight, Calendar, CreditCard, Store, Pencil, Repeat, Trash2, Plus, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import {
  type FormState,
  type TxnType,
  amountReducer,
  amountValue,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/molecules/alert-dialog'
import { useTransactionMutations } from '@/hooks/useTransactionsQuery'
import { useTransactionCategories } from '@/hooks/useTransactionCategories'
import { useAccounts } from '@/contexts/AccountContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionFormProps {
  mode: 'create' | 'edit'
  userId: string
  /**
   * Pre-seed values for edit mode; also accepts `id` for targeting the existing record
   * and `isBalanceAdjustment` (display-only flag — not part of editable FormState).
   */
  initial?: Partial<FormState> & { id?: string; isBalanceAdjustment?: boolean }
  onDone: () => void
}

type Phase = 'form' | 'success'

const TYPE_OPTION_VALUES: TxnType[] = ['EXPENSE', 'INCOME', 'TRANSFER']

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
    merchant: '',
    note: '',
    date: todayString(),
    currency: 'IDR',
    isRecurring: false,
    recurringFrequency: null,
    recurringEndDate: null,
  }
  return initial ? { ...base, ...initial } : base
}

/** Currency symbol shown as the amount prefix (Rp for IDR, else the ISO code). */
function currencyPrefix(currency: string): string {
  return currency === 'IDR' ? 'Rp' : currency
}

/** Locale-grouped amount (IDR uses id-ID dot separators to match the design). */
function groupedAmount(s: FormState): string {
  return amountValue(s.amount).toLocaleString(s.currency === 'IDR' ? 'id-ID' : 'en-US')
}

/** Human date for the detail row, e.g. "Today, Jun 7 2025" / "Jun 7 2025". */
function formatRowDate(iso: string, todayLabel: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return iso === todayString() ? `${todayLabel}, ${formatted}` : formatted
}

/** Tinted rounded-square icon bubble used on every detail row (design `H6KJp`). */
function IconBubble({ icon: Icon, bg, fg }: { icon: LucideIcon; bg: string; fg: string }) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', bg)}>
      <Icon className={cn('size-5', fg)} />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionForm({ mode, userId, initial, onDone }: TransactionFormProps) {
  const t = useTranslations('transactions.form')
  const TYPE_OPTIONS: Array<{ value: TxnType; label: string }> = TYPE_OPTION_VALUES.map((v) => ({
    value: v,
    label: t(v === 'EXPENSE' ? 'expense' : v === 'INCOME' ? 'income' : 'transfer'),
  }))

  const { create, update, delete: deleteTxn, isCreating, isUpdating, isDeleting } = useTransactionMutations(userId)
  const { categories, addCategory, isAdding } = useTransactionCategories(userId)
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

  // Amount keypad visibility — the custom numpad only shows while the amount
  // field is active. Selecting any other field hides it so the native keyboard
  // / date picker isn't blocked, and the bottom Save CTA takes its place. On
  // create, amount is the first input so it starts open; on edit the amount is
  // already set, so start closed and show the Save CTA.
  const [keypadOpen, setKeypadOpen] = useState(mode === 'create')

  // Focusing the amount opens the keypad and dismisses any native keyboard.
  function activateAmount() {
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur?.()
    }
    setKeypadOpen(true)
  }

  // Delete confirm dialog
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Derived
  const fields = fieldsForType(state.type)
  const pending = mode === 'create' ? isCreating : isUpdating

  // Display-only flag from initial (not part of editable FormState)
  const isBalanceAdjustment = initial?.isBalanceAdjustment ?? false

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
    setKeypadOpen(true)
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

  async function handleDelete() {
    if (!initial?.id) return
    try {
      await deleteTxn(initial.id)
    } catch {
      // useTransactionMutations already shows an error toast via its onError handler
      return
    }
    setDeleteOpen(false)
    onDone()
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
      className="flex flex-col gap-4 py-4"
    >
      {/* Header — no top Save button; saving happens via the bottom CTA */}
      <CreateFlowHeader
        title={mode === 'create' ? t('addTitle') : t('editTitle')}
        onBack={onDone}
        backLabel={t('back')}
      />

      {/* Type segmented control */}
      <SegmentedControl<TxnType>
        options={TYPE_OPTIONS}
        value={state.type}
        onChange={handleTypeChange}
      />

      {/* Amount + Category card */}
      <div className="rounded-2xl bg-card p-5 shadow-card">
        {/* Amount — tap to (re)open the keypad */}
        <button
          type="button"
          onClick={activateAmount}
          aria-label={t('amount')}
          className="flex w-full flex-col items-start gap-1.5 text-left"
        >
          <span className="text-sm leading-body-sm text-muted-foreground">{t('amount')}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl leading-title-3 font-semibold text-muted-foreground/70">
              {currencyPrefix(state.currency)}
            </span>
            <span
              className={cn(
                'text-4xl leading-title-1 font-bold tabular-nums',
                amountValue(state.amount) === 0 ? 'text-muted-foreground/50' : 'text-foreground',
              )}
            >
              {groupedAmount(state)}
            </span>
            {/* Blinking caret marks the amount as the active field */}
            {keypadOpen && (
              <span aria-hidden className="h-8 w-0.5 animate-pulse rounded-full bg-primary" />
            )}
          </span>
        </button>
        {showValidation && !state.amount.digits && (
          <p className="mt-1 text-xs leading-caption text-destructive">{t('enterAmount')}</p>
        )}
        {isBalanceAdjustment && (
          <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs leading-caption text-muted-foreground">
            {t('balanceAdjustment')}
          </span>
        )}

        {/* Category chips (not shown for TRANSFER) */}
        {fields.category && (
          <>
            <div className="my-4 h-px bg-border" />
            <span className="text-sm leading-body-sm text-muted-foreground">{t('category')}</span>
            <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories
                .filter((c) => c.group_type === state.type)
                .map((c) => {
                  const Icon = getCategoryIcon(c.name)
                  const tint = getCategoryTint(c.name)
                  const selected = c.id === state.categoryId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setKeypadOpen(false); setState((prev) => ({ ...prev, categoryId: c.id })) }}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted/50',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', selected ? 'text-primary-foreground' : tint.fg)} />
                      <span className="text-sm leading-body-sm font-medium whitespace-nowrap">{c.name}</span>
                    </button>
                  )
                })}
              {/* More — opens the full picker (search, all categories, create) */}
              <button
                type="button"
                onClick={() => { setKeypadOpen(false); setCategoryOpen(true) }}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-2 text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <Plus className="size-4 shrink-0" />
                <span className="text-sm leading-body-sm font-medium whitespace-nowrap">{t('more')}</span>
              </button>
            </div>
            {showValidation && !state.categoryId && (
              <p className="mt-2 text-xs leading-caption text-destructive">{t('selectCategory')}</p>
            )}
          </>
        )}
      </div>

      {/* Detail rows card */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        {/* Account row (From account for TRANSFER) */}
        <button
          type="button"
          onClick={() => { setKeypadOpen(false); setAccountOpen(true) }}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <IconBubble icon={CreditCard} bg="bg-tint-blue-bg" fg="text-tint-blue-fg" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-caption text-muted-foreground">
              {fields.toAccount ? t('fromAccount') : t('account')}
            </span>
            <span className={cn('block truncate text-md leading-body-lg font-medium', selectedAccount ? 'text-foreground' : 'text-muted-foreground')}>
              {selectedAccount ? selectedAccount.name : t('selectAccount')}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>

        {/* To account row (TRANSFER only) */}
        {fields.toAccount && (
          <>
            <div className="ml-[68px] h-px bg-border" />
            <button
              type="button"
              onClick={() => { setKeypadOpen(false); setToAccountOpen(true) }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <IconBubble icon={CreditCard} bg="bg-tint-teal-bg" fg="text-tint-teal-fg" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs leading-caption text-muted-foreground">{t('toAccount')}</span>
                <span className={cn('block truncate text-md leading-body-lg font-medium', selectedToAccount ? 'text-foreground' : 'text-muted-foreground')}>
                  {selectedToAccount ? selectedToAccount.name : t('toAccount')}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
          </>
        )}

        {/* Date row */}
        <div className="ml-[68px] h-px bg-border" />
        <label className="relative flex w-full items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50">
          <IconBubble icon={Calendar} bg="bg-tint-purple-bg" fg="text-tint-purple-fg" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-caption text-muted-foreground">{t('date')}</span>
            <span className="block text-md leading-body-lg font-medium text-foreground">{formatRowDate(state.date, t('today'))}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          {/* Transparent native picker overlays the row so tapping anywhere opens it */}
          <input
            type="date"
            value={state.date}
            onFocus={() => setKeypadOpen(false)}
            onChange={(e) => setState((prev) => ({ ...prev, date: e.target.value }))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={t('date')}
          />
        </label>

        {/* Merchant row */}
        <div className="ml-[68px] h-px bg-border" />
        <label className="flex w-full items-center gap-3 px-4 py-3">
          <IconBubble icon={Store} bg="bg-tint-orange-bg" fg="text-tint-orange-fg" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-caption text-muted-foreground">{t('merchant')}</span>
            <input
              type="text"
              placeholder={t('addMerchant')}
              value={state.merchant}
              onFocus={() => setKeypadOpen(false)}
              onChange={(e) => setState((prev) => ({ ...prev, merchant: e.target.value }))}
              className="block w-full bg-transparent text-md leading-body-lg font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            />
          </span>
        </label>

        {/* Note row */}
        <div className="ml-[68px] h-px bg-border" />
        <label className="flex w-full items-center gap-3 px-4 py-3">
          <IconBubble icon={Pencil} bg="bg-tint-green-bg" fg="text-tint-green-fg" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-caption text-muted-foreground">{t('noteOptional')}</span>
            <input
              type="text"
              placeholder={t('addNote')}
              value={state.note}
              onFocus={() => setKeypadOpen(false)}
              onChange={(e) => setState((prev) => ({ ...prev, note: e.target.value }))}
              className="block w-full bg-transparent text-md leading-body-lg font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            />
          </span>
        </label>

        {/* Recurring row */}
        <div className="ml-[68px] h-px bg-border" />
        <div className="flex w-full items-center gap-3 px-4 py-3">
          <IconBubble icon={Repeat} bg="bg-tint-blue-bg" fg="text-tint-blue-fg" />
          <span className="min-w-0 flex-1">
            <span className="block text-md leading-body-lg font-medium text-foreground">{t('recurring')}</span>
            {!state.isRecurring && (
              <span className="block text-xs leading-caption text-muted-foreground">{t('recurringHint')}</span>
            )}
          </span>
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

      {/* Delete action — edit mode only */}
      {mode === 'edit' && (
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={isDeleting}
          className={cn(
            'flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30',
            'text-md leading-body-lg font-medium text-destructive',
            'transition-colors hover:bg-destructive/5 active:bg-destructive/10',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          <Trash2 className="size-4" />
          {t('delete')}
        </button>
      )}

      {/* Sticky bottom area — pinned to the viewport bottom. Shows the custom
          numpad while the amount field is active, otherwise the primary "Save
          Transaction" CTA (design `L8FhK`). Both use `fixed` (not `sticky`) so
          they stay docked regardless of scroll; an in-flow spacer lets content
          clear them. The bottom nav is hidden on this full-screen flow. */}
      {keypadOpen ? (
        <>
          <div aria-hidden className="h-[264px] shrink-0" />
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full max-w-md">
              <AmountKeypad
                onKey={(action) =>
                  setState((prev) => ({ ...prev, amount: amountReducer(prev.amount, action) }))
                }
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div aria-hidden className="h-24 shrink-0" />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
            <div className="pointer-events-auto mx-auto w-full max-w-md">
              <button
                type="submit"
                form="txn-form"
                disabled={pending || !isFormValid(state)}
                className={cn(
                  'flex h-[52px] w-full items-center justify-center rounded-2xl text-md leading-body-lg font-semibold transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
                  'disabled:bg-muted disabled:text-muted-foreground disabled:pointer-events-none',
                )}
              >
                {pending ? t('adding') : t('saveTransaction')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pickers */}
      {fields.category && (
        <CategoryPickerSheet
          open={categoryOpen}
          type={state.type}
          categories={categories}
          selectedId={state.categoryId}
          onSelect={(id) => setState((prev) => ({ ...prev, categoryId: id }))}
          onOpenChange={setCategoryOpen}
          onAddCategory={(name, addType) => addCategory(name, addType)}
          isAdding={isAdding}
        />
      )}

      <AccountPickerSheet
        open={accountOpen}
        title={fields.toAccount ? t('from') : t('account')}
        accounts={accounts}
        selectedId={state.accountId}
        onSelect={handleAccountSelect}
        onOpenChange={setAccountOpen}
        showBalance={false}
      />

      {fields.toAccount && (
        <AccountPickerSheet
          open={toAccountOpen}
          title={t('to')}
          accounts={accounts}
          selectedId={state.toAccountId}
          excludeId={state.accountId}
          onSelect={(id) => setState((prev) => ({ ...prev, toAccountId: id }))}
          onOpenChange={setToAccountOpen}
          showBalance={false}
        />
      )}
    </form>
  )
}
