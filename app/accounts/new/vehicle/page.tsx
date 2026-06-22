'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Car, Banknote, TrendingDown } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { vehicleSchema } from '@/lib/validations-account'
import { buildAccountPayload } from '@/lib/wallets-utils'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { MoneyInput } from '@/components/features/accounts/create/MoneyInput'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'

const FORM_ID = 'create-vehicle'

/** 08c — Create Vehicle Asset (design `ck0jG`); maintenance budget toggle deferred per spec. */
export default function VehiclePage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const { user } = useAuth()
  const { createAccount } = useAccounts()
  const [created, setCreated] = useState<{ name: string; type: string } | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } =
    useForm<z.input<typeof vehicleSchema>, unknown, z.output<typeof vehicleSchema>>({
      resolver: zodResolver(vehicleSchema),
      defaultValues: {
        vehicleType: 'CAR',
        name: '',
        purchasePrice: '',
        depreciationRate: '10',
      },
    })
  const vehicleType = watch('vehicleType')

  const onSubmit = async (data: z.output<typeof vehicleSchema>) => {
    if (!user || pending) return
    setPending(true)
    try {
      const account = await createAccount(
        buildAccountPayload(user.id, {
          name: data.name,
          type: 'VEHICLE',
          balance: data.purchasePrice,
          vehicle_type: data.vehicleType,
          depreciation_rate: data.depreciationRate,
        })
      )
      setCreated({ name: account.name, type: account.type })
    } catch {
      toast.error(t('errors.createFailed'))
    } finally {
      setPending(false)
    }
  }

  if (created) {
    return (
      <div className="mx-auto w-full max-w-md px-0 pt-3 md:pt-8">
        <AccountCreatedView account={created} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
      <CreateFlowHeader
        title={t('vehicle.title')}
        onBack={() => router.push('/accounts/new')}
        backLabel={t('common.back')}
        formId={FORM_ID}
        saveLabel={t('common.save')}
        pending={pending}
      />
      <SegmentedControl
        options={[
          { value: 'CAR', label: t('vehicle.segCar') },
          { value: 'MOTORCYCLE', label: t('vehicle.segMotorcycle') },
          { value: 'TRUCK', label: t('vehicle.segTruck') },
        ]}
        value={vehicleType as string}
        onChange={(v) => setValue('vehicleType', v as 'CAR' | 'MOTORCYCLE' | 'TRUCK')}
      />
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={Car} error={errors.name && t(`errors.${errors.name.message}`)}>
            <input
              {...register('name')}
              placeholder={t('vehicle.namePlaceholder')}
              aria-label={t('vehicle.nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Banknote} error={errors.purchasePrice && t(`errors.${errors.purchasePrice.message}`)}>
            <MoneyInput control={control} name="purchasePrice" label={t('vehicle.priceLabel')} />
          </FormRow>
          <FormRow icon={TrendingDown} error={errors.depreciationRate && t(`errors.${errors.depreciationRate.message}`)}>
            <div className="flex items-center gap-2">
              <span className="text-sm leading-body-sm text-muted-foreground">{t('vehicle.depreciationLabel')}</span>
              <input
                {...register('depreciationRate')}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                aria-label={t('vehicle.depreciationLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
        </FormCard>
        <SubmitButton label={t('vehicle.submit')} pending={pending} />
      </form>
    </div>
  )
}
