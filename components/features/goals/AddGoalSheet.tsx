'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Button } from '@/components/ui/atoms/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/molecules/select'
import { useCreateGoal } from '@/hooks/useGoalsQuery'
import { canHaveGoal } from '@/lib/goals/eligibility'
import { useAccounts } from '@/contexts/AccountContext'
import { goalIcon, goalTint } from '@/lib/goals/goal-style'
import { GoalType } from '@/types/database'
import { cn } from '@/lib/utils'
import { GoalCreatedView } from './GoalCreatedView'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the account is locked + pre-filled. Omit for an account picker. */
  accountId?: string
  onCreated: (goalId: string) => void
}

// The 10 goal types, in display order (emergency_fund first → it is the default).
const GOAL_TYPES: GoalType[] = [
  'emergency_fund', 'vacation', 'house_down_payment', 'car_purchase', 'education',
  'wedding', 'investment', 'gadget', 'debt_payoff', 'other',
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12

// Default month/year: one month into the future, so the form is valid with no date input.
function defaultMonthYear(): { month: number; year: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export function AddGoalSheet({ open, onOpenChange, accountId, onCreated }: Props) {
  const t = useTranslations('goals')
  const { accounts } = useAccounts()

  const eligibleAccounts = useMemo(
    () => accounts.filter((a) => canHaveGoal(a.type)),
    [accounts]
  )

  // Account selection: locked to `accountId` when given, otherwise pickable.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accountId ?? eligibleAccounts[0]?.id ?? ''
  )

  // useAccounts() returns [] on first paint then hydrates. In the picker case
  // (no accountId prop), seed the default to the first eligible account once it
  // arrives — without clobbering an explicit user selection.
  useEffect(() => {
    if (!accountId && !selectedAccountId && eligibleAccounts.length > 0) {
      setSelectedAccountId(eligibleAccounts[0].id)
    }
  }, [accountId, selectedAccountId, eligibleAccounts])

  const resolvedAccountId = accountId ?? selectedAccountId
  const resolvedAccount = accounts.find((a) => a.id === resolvedAccountId)

  // Bind the mutation to the resolved account (updates as the user picks).
  const { mutateAsync, isPending } = useCreateGoal(resolvedAccountId)

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1),
        goalType: z.string().min(1),
        targetAmount: z.coerce.number().positive(),
        month: z.coerce.number().int().min(1).max(12),
        year: z.coerce.number().int(),
      }),
    []
  )

  const { defaultValue } = useMemo(() => {
    const dmy = defaultMonthYear()
    return { defaultValue: dmy }
  }, [])

  // In-sheet success state. When set, the sheet shows GoalCreatedView instead
  // of the form. Cleared by reset() so reopening the sheet shows the form again.
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)

  const {
    register, handleSubmit, control, watch, setValue, reset: resetForm,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      goalType: 'emergency_fund' as GoalType,
      targetAmount: 0,
      month: defaultValue.month,
      year: defaultValue.year,
    },
  })

  const selectedType = watch('goalType') as GoalType

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i) // current..+10
  const currency = resolvedAccount?.currency ?? 'IDR'

  const onSubmit = handleSubmit(async (values) => {
    if (!resolvedAccountId) return
    const month = Number(values.month)
    const year = Number(values.year)
    // API parses targetDate from "MM/YYYY" and converts to month-end ISO server-side.
    const targetDate = `${String(month).padStart(2, '0')}/${year}`
    const result = await mutateAsync({
      name: values.name.trim(),
      goalType: values.goalType as GoalType,
      targetAmount: Number(values.targetAmount),
      targetDate,
    })
    const createdId =
      (result as { goal?: { id?: string } }).goal?.id ??
      (result as { id?: string }).id ??
      ''
    // Show the in-sheet success recap instead of navigating immediately.
    // onCreated(...) fires later, from the "Lihat Target" CTA.
    setCreatedGoalId(createdId)
  })

  // Clears the form and dismisses the success view (createdGoalId → null),
  // so reopening the sheet starts fresh on the form.
  const reset = () => {
    setCreatedGoalId(null)
    resetForm()
  }

  const submitting = isPending || isSubmitting

  // Radix dismissals (overlay tap, swipe, close button) bypass the success-view
  // CTAs, so clear the finished flow here or the next open replays the recap.
  // Mid-entry form values are kept on purpose — only a completed create resets.
  const handleOpenChange = (next: boolean) => {
    if (!next && createdGoalId) reset()
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl bg-card p-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[90dvh]"
      >
        <div className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />

        {createdGoalId ? (
          // Success recap — brings its own sticky-footer CTAs, so it replaces
          // the entire scroll-body + footer region (no double-wrapped footer).
          <GoalCreatedView
            goalId={createdGoalId}
            onViewGoal={() => {
              onCreated(createdGoalId)
              reset()
            }}
            onBackToAccount={() => {
              onOpenChange(false)
              reset()
            }}
          />
        ) : (
        /* Scrollable body */
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <SheetHeader className="px-0 text-left">
              <SheetTitle>{t('create.title')}</SheetTitle>
              <SheetDescription>{t('create.subtitle')}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex flex-col gap-4">
              {/* Nama */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-name">{t('create.name')}</Label>
                <Input id="goal-name" aria-label="create.name" {...register('name')} />
              </div>

              {/* Jenis — chip row */}
              <div className="flex flex-col gap-1.5">
                <Label>{t('create.type')}</Label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_TYPES.map((type) => {
                    const Icon = goalIcon(type)
                    const tint = goalTint(type)
                    const selected = selectedType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setValue('goalType', type, { shouldValidate: true })}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:bg-muted/50'
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-5 items-center justify-center rounded-full',
                            selected ? 'bg-primary-foreground/20' : tint.bg
                          )}
                        >
                          <Icon className={cn('size-3', selected ? 'text-primary-foreground' : tint.fg)} />
                        </span>
                        {t(`types.${type}`)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Akun — locked row or picker */}
              <div className="flex flex-col gap-1.5">
                <Label>{t('create.account')}</Label>
                {accountId ? (
                  <div className="flex h-[52px] items-center rounded-[14px] border border-input bg-muted px-4 text-md text-foreground">
                    {resolvedAccount?.name ?? ''}
                  </div>
                ) : (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full" aria-label="create.account">
                      <SelectValue placeholder={t('create.accountPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Jumlah Target */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-amount">{t('create.amount')}</Label>
                <Controller
                  control={control}
                  name="targetAmount"
                  render={({ field }) => (
                    <Input
                      id="goal-amount"
                      type="amount"
                      aria-label="create.amount"
                      currency={currency}
                      value={Number(field.value) || 0}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  )}
                />
              </div>

              {/* Tanggal Target — Bulan + Tahun */}
              <div className="flex flex-col gap-1.5">
                <Label>{t('create.date')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Controller
                    control={control}
                    name="month"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger className="w-full" aria-label="create.month">
                          <SelectValue placeholder={t('create.month')} />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {String(m).padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    control={control}
                    name="year"
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger className="w-full" aria-label="create.year">
                          <SelectValue placeholder={t('create.year')} />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky footer CTA */}
          <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <Button
              type="submit"
              disabled={submitting || !resolvedAccountId}
              className="h-[52px] w-full rounded-[14px] text-md leading-body-lg font-semibold"
            >
              {t('create.submit')}
            </Button>
          </div>
        </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
