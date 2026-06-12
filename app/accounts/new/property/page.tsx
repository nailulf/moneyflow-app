'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { House, Banknote, Calendar, Landmark, Percent, Wallet, Hourglass } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { propertySchema } from '@/lib/validations-account'
import { buildAccountPayload, deriveMortgage } from '@/lib/wallets-utils'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { ToggleSection } from '@/components/features/accounts/create/ToggleSection'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'

const FORM_ID = 'create-property'

/** 08b — Create Property Asset (design `W8HsKt`); mortgage toggle creates a linked MORTGAGE. */
export default function PropertyPage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const { user } = useAuth()
  const { createAccount, deleteAccount } = useAccounts()
  const [created, setCreated] = useState<{ name: string; type: string; note?: string } | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<z.input<typeof propertySchema>, unknown, z.output<typeof propertySchema>>({
      resolver: zodResolver(propertySchema),
      defaultValues: {
        name: '',
        currentValue: '',
        purchaseDate: '',
        hasMortgage: false,
        downPayment: '',
        interestRate: '',
        monthlyPayment: '',
        loanTermYears: '',
      },
    })
  const hasMortgage = watch('hasMortgage')

  const onSubmit = async (data: z.output<typeof propertySchema>) => {
    if (!user) return
    setPending(true)
    try {
      const property = await createAccount(
        buildAccountPayload(user.id, {
          name: data.name,
          type: 'PROPERTY',
          balance: data.currentValue,
          purchase_date: data.purchaseDate,
          down_payment: data.hasMortgage ? (data.downPayment ?? null) : null,
        })
      )
      if (
        data.hasMortgage &&
        data.downPayment !== undefined &&
        data.interestRate !== undefined &&
        data.monthlyPayment !== undefined &&
        data.loanTermYears !== undefined
      ) {
        try {
          const mortgage = deriveMortgage({
            propertyName: data.name,
            currentValue: data.currentValue,
            downPayment: data.downPayment,
            interestRate: data.interestRate,
            monthlyPayment: data.monthlyPayment,
            loanTermYears: data.loanTermYears,
            purchaseDate: data.purchaseDate,
          })
          await createAccount(
            buildAccountPayload(user.id, {
              name: mortgage.name,
              type: 'MORTGAGE',
              balance: mortgage.balance,
              monthly_payment: mortgage.monthly_payment,
              interest_rate: mortgage.interest_rate,
              loan_term_months: mortgage.loan_term_months,
              mortgage_end_date: mortgage.mortgage_end_date,
            })
          )
          setCreated({ name: property.name, type: property.type, note: t('success.mortgageCreated') })
        } catch {
          // Roll the property back so we never leave a half-created pair.
          await deleteAccount(property.id).catch(() => {})
          toast.error(t('errors.mortgageRolledBack'))
          return
        }
      } else {
        setCreated({ name: property.name, type: property.type })
      }
    } catch {
      toast.error(t('errors.createFailed'))
    } finally {
      setPending(false)
    }
  }

  if (created) {
    return (
      <div className="mx-auto w-full max-w-md px-0 pt-3 md:pt-8">
        <AccountCreatedView account={created} note={created.note} />
      </div>
    )
  }

  const numberRow = (
    name: 'downPayment' | 'interestRate' | 'monthlyPayment' | 'loanTermYears',
    icon: typeof Banknote,
    label: string,
    step?: string
  ) => (
    <FormRow icon={icon} error={errors[name] && t(`errors.${errors[name]!.message}`)}>
      <div className="flex items-center gap-2">
        <span className="text-sm leading-body-sm text-muted-foreground">{label}</span>
        <input
          {...register(name)}
          type="number"
          inputMode="decimal"
          min="0"
          step={step ?? 'any'}
          aria-label={label}
          className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
        />
      </div>
    </FormRow>
  )

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-10 md:pt-8">
      <CreateFlowHeader
        title={t('property.title')}
        onBack={() => router.push('/accounts/new')}
        backLabel={t('common.back')}
        formId={FORM_ID}
        saveLabel={t('common.save')}
      />
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={House} error={errors.name && t(`errors.${errors.name.message}`)}>
            <input
              {...register('name')}
              placeholder={t('property.namePlaceholder')}
              aria-label={t('property.nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Banknote} error={errors.currentValue && t(`errors.${errors.currentValue.message}`)}>
            <div className="flex items-center gap-2">
              <span className="text-sm leading-body-sm text-muted-foreground">{t('property.valueLabel')}</span>
              <input
                {...register('currentValue')}
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={t('property.valueLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
          <FormRow icon={Calendar} error={errors.purchaseDate && t(`errors.${errors.purchaseDate.message}`)}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('property.purchaseDateLabel')}</span>
              <input
                {...register('purchaseDate')}
                type="date"
                aria-label={t('property.purchaseDateLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
        </FormCard>

        <ToggleSection
          icon={Landmark}
          iconClasses="bg-tint-green-bg text-tint-green-fg"
          label={t('property.mortgage')}
          checked={hasMortgage}
          onCheckedChange={(v) => setValue('hasMortgage', v)}
        >
          {numberRow('downPayment', Wallet, t('property.downPayment'))}
          {numberRow('interestRate', Percent, t('property.interestRate'), '0.1')}
          {numberRow('monthlyPayment', Banknote, t('property.monthlyPayment'))}
          {numberRow('loanTermYears', Hourglass, t('property.loanTermYears'), '1')}
        </ToggleSection>

        <SubmitButton label={t('property.submit')} pending={pending} />
      </form>
    </div>
  )
}
