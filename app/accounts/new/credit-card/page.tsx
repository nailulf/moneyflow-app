'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CreditCard, Banknote, Calendar, CalendarCheck } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { creditCardSchema } from '@/lib/validations-account'
import { buildAccountPayload } from '@/lib/wallets-utils'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'

const FORM_ID = 'create-credit-card'

/** 08d — Create Credit Card (design `UpZnO`). */
export default function CreditCardPage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const { user } = useAuth()
  const { createAccount } = useAccounts()
  const [created, setCreated] = useState<{ name: string; type: string } | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, formState: { errors } } =
    useForm<z.input<typeof creditCardSchema>, unknown, z.output<typeof creditCardSchema>>({
      resolver: zodResolver(creditCardSchema),
      defaultValues: { name: '', creditLimit: '', statementDay: '25', dueDay: '15' },
    })

  const onSubmit = async (data: z.output<typeof creditCardSchema>) => {
    if (!user) return
    setPending(true)
    try {
      const account = await createAccount(
        buildAccountPayload(user.id, {
          name: data.name,
          type: 'CREDIT_CARD',
          balance: 0,
          credit_limit: data.creditLimit,
          statement_day: data.statementDay,
          due_day: data.dueDay,
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
        title={t('creditCard.title')}
        onBack={() => router.push('/accounts/new')}
        backLabel={t('common.back')}
        formId={FORM_ID}
        saveLabel={t('common.save')}
      />
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={CreditCard} error={errors.name && t(`errors.${errors.name.message}`)}>
            <input
              {...register('name')}
              placeholder={t('creditCard.namePlaceholder')}
              aria-label={t('creditCard.nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Banknote} error={errors.creditLimit && t(`errors.${errors.creditLimit.message}`)}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('creditCard.limitLabel')}</span>
              <input
                {...register('creditLimit')}
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={t('creditCard.limitLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
          <FormRow icon={Calendar} error={errors.statementDay && t(`errors.${errors.statementDay.message}`)}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('creditCard.statementLabel')}</span>
              <input
                {...register('statementDay')}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                aria-label={t('creditCard.statementLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
          <FormRow icon={CalendarCheck} error={errors.dueDay && t(`errors.${errors.dueDay.message}`)}>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm leading-body-sm text-muted-foreground">{t('creditCard.dueLabel')}</span>
              <input
                {...register('dueDay')}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                aria-label={t('creditCard.dueLabel')}
                className="w-full bg-transparent text-right text-sm leading-body-sm font-semibold text-foreground outline-none"
              />
            </div>
          </FormRow>
        </FormCard>
        <InfoBanner variant="info">{t('creditCard.info')}</InfoBanner>
        <SubmitButton label={t('creditCard.submit')} pending={pending} />
      </form>
    </div>
  )
}
