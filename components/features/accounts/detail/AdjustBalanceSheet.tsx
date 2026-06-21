'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowUp, ArrowDown, Info } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/organisms/sheet'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'
import { Button } from '@/components/ui/atoms/button'
import { formatCurrency, parseCurrencyAmount } from '@/lib/data-utils'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  currentBalance: number
  currency: string
  onSaved: () => void
}

export function AdjustBalanceSheet({ open, onOpenChange, accountId, currentBalance, currency, onSaved }: Props) {
  const t = useTranslations('accountDetail')
  const [newBalance, setNewBalance] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const parsed = parseCurrencyAmount(newBalance)
  const diff = newBalance.trim() === '' ? null : parsed - currentBalance
  const hasChange = diff !== null && diff !== 0

  const reset = () => { setNewBalance(''); setNote('') }

  const handleSave = async () => {
    if (!hasChange) return
    setSaving(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_balance: parsed,
          note: note.trim() || null,
          adjustment_date: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      if (data?.message && /no.?change|already matches/i.test(data.message)) {
        toast.info(t('adjustDialog.subtitle'))
      } else {
        toast.success(t('adjustDialog.save'))
        onSaved()
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error(t('adjustDialog.confirm'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-2">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="text-left">
          <SheetTitle>{t('adjustDialog.title')}</SheetTitle>
          <SheetDescription>{t('adjustDialog.subtitle')}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">{t('adjustDialog.currentBalance')}</span>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(currentBalance, currency)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-new-balance">{t('adjustDialog.newBalance')}</Label>
            <Input id="adj-new-balance" inputMode="decimal" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="0" />
          </div>

          {diff !== null && diff !== 0 && (
            <div className={cn('flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold', diff > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
              {diff > 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
              {t(diff > 0 ? 'adjustDialog.willAdd' : 'adjustDialog.willRemove', { amount: formatCurrency(Math.abs(diff), currency) })}
            </div>
          )}

          {diff !== null && diff !== 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-selected px-3 py-2.5 text-xs leading-caption text-selected-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>{t('adjustDialog.infoBanner', { amount: `${diff > 0 ? '+' : '−'} ${formatCurrency(Math.abs(diff), currency)}` })}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-note">{t('adjustDialog.note')}</Label>
            <Input id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('adjustDialog.notePlaceholder')} />
          </div>

          <Button onClick={handleSave} disabled={!hasChange || saving} className="h-12 w-full">
            {saving ? t('adjustDialog.adjusting') : t('adjustDialog.save')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
