'use client'

import { useMemo } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
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
import { useUpdateGoal } from '@/hooks/useGoalsQuery'
import { parseTargetDate } from '@/lib/goals/calculations'
import { goalIcon, goalTint } from '@/lib/goals/goal-style'
import { FinancialGoalDB, GoalType } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: FinancialGoalDB
  /** Currency for the amount field (from the goal's account). Defaults to IDR. */
  currency?: string
}

// The 10 goal types, in display order.
const GOAL_TYPES: GoalType[] = [
  'emergency_fund', 'vacation', 'house_down_payment', 'car_purchase', 'education',
  'wedding', 'investment', 'gadget', 'debt_payoff', 'other',
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12

export function EditGoalSheet({ open, onOpenChange, goal, currency = 'IDR' }: Props) {
  const t = useTranslations('goals')
  const { mutateAsync, isPending } = useUpdateGoal(goal.id)

  // Pre-fill month/year from the goal's stored target_date (ISO or MM/YYYY).
  const initial = useMemo(() => {
    const d = parseTargetDate(goal.target_date)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  }, [goal.target_date])

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

  const {
    register, handleSubmit, control, setValue,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: goal.name,
      goalType: goal.goal_type as GoalType,
      targetAmount: Number(goal.target_amount),
      month: initial.month,
      year: initial.year,
    },
  })

  const selectedType = useWatch({ control, name: 'goalType' }) as GoalType

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i) // current..+10

  const onSubmit = handleSubmit(async (values) => {
    const month = Number(values.month)
    const year = Number(values.year)
    // API parses targetDate from "MM/YYYY" and converts to month-end ISO server-side.
    const targetDate = `${String(month).padStart(2, '0')}/${year}`
    await mutateAsync({
      name: values.name.trim(),
      targetAmount: Number(values.targetAmount),
      targetDate,
    })
    onOpenChange(false)
  })

  const submitting = isPending || isSubmitting

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl bg-card p-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[90dvh]"
      >
        <div className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />

        {/* Scrollable body */}
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <SheetHeader className="px-0 text-left">
              <SheetTitle>{t('edit.title')}</SheetTitle>
              <SheetDescription>{t('edit.subtitle')}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex flex-col gap-4">
              {/* Nama */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-goal-name">{t('create.name')}</Label>
                <Input id="edit-goal-name" aria-label="create.name" {...register('name')} />
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

              {/* Jumlah Target */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-goal-amount">{t('create.amount')}</Label>
                <Controller
                  control={control}
                  name="targetAmount"
                  render={({ field }) => (
                    <Input
                      id="edit-goal-amount"
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
              disabled={submitting}
              className="h-[52px] w-full rounded-[14px] text-md leading-body-lg font-semibold"
            >
              {t('edit.submit')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
