'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/organisms/sheet'
import { Button } from '@/components/ui/atoms/button'
import { Input } from '@/components/ui/atoms/input'
import { cn } from '@/lib/utils'
import type { TransactionFilters } from '@/lib/transaction-filters'

interface Option { id: string; name: string }
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Option[]
  accounts: Option[]
  filters: TransactionFilters
  onApply: (next: Pick<TransactionFilters, 'categoryIds' | 'accountIds' | 'amountMin' | 'amountMax'>) => void
}

export function TransactionFilterSheet({ open, onOpenChange, categories, accounts, filters, onApply }: Props) {
  const t = useTranslations('transactions.screen.filter')
  const [draftCats, setDraftCats] = useState<string[]>(filters.categoryIds)
  const [draftAccts, setDraftAccts] = useState<string[]>(filters.accountIds)
  const [min, setMin] = useState<string>(filters.amountMin?.toString() ?? '')
  const [max, setMax] = useState<string>(filters.amountMax?.toString() ?? '')

  useEffect(() => {
    if (open) {
      setDraftCats(filters.categoryIds); setDraftAccts(filters.accountIds)
      setMin(filters.amountMin?.toString() ?? ''); setMax(filters.amountMax?.toString() ?? '')
    }
  }, [open, filters])

  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  const chip = (active: boolean) =>
    cn('rounded-full border px-3 py-1 text-xs', active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')

  const apply = () => {
    onApply({
      categoryIds: draftCats,
      accountIds: draftAccts,
      amountMin: min ? Number(min) : undefined,
      amountMax: max ? Number(max) : undefined,
    })
    onOpenChange(false)
  }
  const reset = () => { setDraftCats([]); setDraftAccts([]); setMin(''); setMax('') }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader><SheetTitle>{t('title')}</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{t('categories')}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" className={chip(draftCats.includes(c.id))} onClick={() => setDraftCats((a) => toggle(a, c.id))}>{c.name}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{t('accounts')}</p>
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <button key={a.id} type="button" className={chip(draftAccts.includes(a.id))} onClick={() => setDraftAccts((x) => toggle(x, a.id))}>{a.name}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Input inputMode="numeric" placeholder={t('amountMin')} value={min} onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ''))} />
            <Input inputMode="numeric" placeholder={t('amountMax')} value={max} onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={reset}>{t('reset')}</Button>
            <Button className="flex-1" onClick={apply}>{t('apply')}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
