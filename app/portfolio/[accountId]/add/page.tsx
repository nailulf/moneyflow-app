'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Tag, Hash, Banknote, Calendar } from 'lucide-react'
import { z } from 'zod'
import { createHolding } from '@/lib/api/holdings'
import type { AssetClass } from '@/lib/portfolio-utils'
import { holdingFormSchema, toHoldingPayload } from '@/lib/validations-holding'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AssetClassSelectCards } from '@/components/features/portfolio/AssetClassSelectCards'
import { formatCurrency } from '@/lib/data-utils'

const FORM_ID = 'add-holding'
const CURRENCIES = ['IDR', 'USD'] as const

type FormIn = z.input<typeof holdingFormSchema>
type FormOut = z.output<typeof holdingFormSchema>

export default function AddAssetPage() {
  const t = useTranslations('holdingCreate')
  const tPortfolio = useTranslations('portfolio')
  const router = useRouter()
  const { accountId } = useParams<{ accountId: string }>()
  const queryClient = useQueryClient()
  const [assetClass, setAssetClass] = useState<AssetClass | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormIn, unknown, FormOut>({
      resolver: zodResolver(holdingFormSchema),
      defaultValues: { name: '', symbol: '', quantity: '', purchase_price: '', purchase_date: '', currency: 'IDR' },
    })

  const currency = watch('currency')
  const rawQty = watch('quantity')
  const rawPrice = watch('purchase_price')
  const qty = Number(rawQty) || 0
  const price = Number(rawPrice) || 0
  const isIdx = assetClass === 'IDX_STOCK'
  const estimatedShares = isIdx ? qty * 100 : qty
  const estimatedTotal = estimatedShares * price

  if (!assetClass) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
        <CreateFlowHeader
          title={t('selectTitle')}
          onBack={() => router.push(`/portfolio/${accountId}`)}
          backLabel={t('close')}
        />
        <div>
          <h2 className="text-xl leading-title-4 font-bold text-foreground">{t('selectPrompt')}</h2>
          <p className="mt-1 text-sm leading-body-sm text-muted-foreground">{t('selectSubtitle')}</p>
        </div>
        <AssetClassSelectCards onSelect={setAssetClass} />
      </div>
    )
  }

  const onSubmit = async (data: FormOut) => {
    if (pending) return
    setPending(true)
    try {
      await createHolding(accountId, toHoldingPayload(data, assetClass))
      queryClient.invalidateQueries({ queryKey: ['holdings', accountId] })
      queryClient.invalidateQueries({ queryKey: ['all-holdings'] })
      router.push(`/portfolio/${accountId}`)
    } catch {
      toast.error(t('errors.createFailed'))
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
      <CreateFlowHeader
        title={t('titleFor', { class: tPortfolio(`class.${assetClass}`) })}
        onBack={() => setAssetClass(null)}
        backLabel={t('back')}
        formId={FORM_ID}
        saveLabel={t('save')}
        pending={pending}
      />

      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={Tag}>
            <input
              {...register('symbol')}
              placeholder={t('tickerPlaceholder')}
              aria-label={t('tickerLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Tag} error={errors.name ? t(`errors.${errors.name.message}`) : undefined}>
            <input
              {...register('name')}
              placeholder={t('namePlaceholder')}
              aria-label={t('nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Hash} error={errors.quantity ? t(`errors.${errors.quantity.message}`) : undefined}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">
                {isIdx ? t('lotsLabel') : t('unitsLabel')}
              </span>
              <input
                {...register('quantity')}
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
                aria-label={isIdx ? t('lotsLabel') : t('unitsLabel')}
                className="w-24 bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
          <FormRow icon={Banknote} error={errors.purchase_price ? t(`errors.${errors.purchase_price.message}`) : undefined}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('priceLabel')}</span>
              <input
                {...register('purchase_price')}
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
                aria-label={t('priceLabel')}
                className="w-28 bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
          <FormRow icon={Calendar}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('dateLabel')}</span>
              <input
                {...register('purchase_date')}
                type="date"
                aria-label={t('dateLabel')}
                className="bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
        </FormCard>

        <SegmentedControl
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          value={currency as (typeof CURRENCIES)[number]}
          onChange={(v) => setValue('currency', v)}
        />

        {isIdx && (
          <p className="px-1 text-tiny text-muted-foreground">{t('lotsHelper')}</p>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-card">
          <span className="text-sm leading-body-sm text-muted-foreground">{t('estimatedTotal')}</span>
          <span className="text-md leading-body-lg font-bold text-foreground">
            {formatCurrency(estimatedTotal, currency)}
          </span>
        </div>

        <SubmitButton label={t('submit')} pending={pending} />
      </form>
    </div>
  )
}
