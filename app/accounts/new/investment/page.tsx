'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Landmark, Briefcase, Pencil } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { investmentSchema } from '@/lib/validations-account'
import { buildAccountPayload } from '@/lib/wallets-utils'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'
import { cn } from '@/lib/utils'

const FORM_ID = 'create-investment'
const GOAL_KEYS = ['capitalGain', 'dividend', 'education', 'retirement'] as const

/** 08e — Create Investment Account (design `EPjuN`). */
export default function InvestmentPage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const { user } = useAuth()
  const { createAccount } = useAccounts()
  const [created, setCreated] = useState<{ name: string; type: string } | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<z.input<typeof investmentSchema>, unknown, z.output<typeof investmentSchema>>({
      resolver: zodResolver(investmentSchema),
      defaultValues: { name: '', broker: '', goal: '' },
    })
  const goal = watch('goal')

  const onSubmit = async (data: z.output<typeof investmentSchema>) => {
    if (!user || pending) return
    setPending(true)
    try {
      const account = await createAccount(
        buildAccountPayload(user.id, {
          name: data.name,
          type: 'INVESTMENT',
          balance: 0,
          broker: data.broker,
          investment_goal: data.goal && data.goal.trim() !== '' ? data.goal.trim() : null,
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
        title={t('investment.title')}
        onBack={() => router.push('/accounts/new')}
        backLabel={t('common.back')}
        formId={FORM_ID}
        saveLabel={t('common.save')}
        pending={pending}
      />
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={Landmark} error={errors.name && t(`errors.${errors.name.message}`)}>
            <input
              {...register('name')}
              placeholder={t('investment.namePlaceholder')}
              aria-label={t('investment.nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Briefcase} error={errors.broker && t(`errors.${errors.broker.message}`)}>
            <input
              {...register('broker')}
              placeholder={t('investment.brokerPlaceholder')}
              aria-label={t('investment.brokerLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
        </FormCard>

        <InfoBanner variant="success">{t('investment.info')}</InfoBanner>

        <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
          <p className="flex items-center gap-2 text-sm leading-body-sm font-bold text-foreground">
            {t('investment.goalLabel')}
            <span className="rounded-[10px] bg-muted px-1.5 py-0.5 text-tiny font-semibold text-muted-foreground">
              {t('investment.optional')}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {GOAL_KEYS.map((key) => {
              const label = t(`investment.goals.${key}`)
              const active = goal === label
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setValue('goal', active ? '' : label)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs leading-caption font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <FormRow icon={Pencil}>
            <input
              {...register('goal')}
              placeholder={t('investment.goalPlaceholder')}
              aria-label={t('investment.goalLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
        </section>

        <SubmitButton label={t('investment.submit')} pending={pending} />
      </form>
    </div>
  )
}
