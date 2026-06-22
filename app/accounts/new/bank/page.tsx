'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Banknote } from 'lucide-react'
import { useAccounts } from '@/contexts/AccountContext'
import { useAuth } from '@/contexts/AuthContext'
import { bankAccountSchema } from '@/lib/validations-account'
import { buildAccountPayload } from '@/lib/wallets-utils'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { FormCard, FormRow } from '@/components/features/accounts/create/FormCard'
import { MoneyInput } from '@/components/features/accounts/create/MoneyInput'
import { SegmentedControl } from '@/components/features/accounts/create/SegmentedControl'
import { SubmitButton } from '@/components/features/accounts/create/SubmitButton'
import { AccountCreatedView } from '@/components/features/accounts/create/AccountCreatedView'

const FORM_ID = 'create-bank-account'

/** 08a — Create Bank / Digital Wallet (design `CuDYL`). */
export default function BankAccountPage() {
  const t = useTranslations('accountCreate')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { createAccount } = useAccounts()
  const [created, setCreated] = useState<{ name: string; type: string } | null>(null)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } =
    useForm<z.input<typeof bankAccountSchema>, unknown, z.output<typeof bankAccountSchema>>({
      resolver: zodResolver(bankAccountSchema),
      defaultValues: {
        kind: searchParams.get('kind') === 'wallet' ? 'DIGITAL_WALLET' : 'BANK',
        name: '',
        balance: '',
      },
    })
  const kind = watch('kind')

  const onSubmit = async (data: z.output<typeof bankAccountSchema>) => {
    if (!user || pending) return
    setPending(true)
    try {
      const account = await createAccount(
        buildAccountPayload(user.id, { name: data.name, type: data.kind, balance: data.balance })
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
        title={t('bank.title')}
        onBack={() => router.push('/accounts/new')}
        backLabel={t('common.back')}
        formId={FORM_ID}
        saveLabel={t('common.save')}
        pending={pending}
      />
      <SegmentedControl
        options={[
          { value: 'BANK', label: t('bank.segBank') },
          { value: 'DIGITAL_WALLET', label: t('bank.segWallet') },
        ]}
        value={kind as string}
        onChange={(v) => setValue('kind', v as 'BANK' | 'DIGITAL_WALLET')}
      />
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormCard>
          <FormRow icon={User} error={errors.name && t(`errors.${errors.name.message}`)}>
            <input
              {...register('name')}
              placeholder={kind === 'BANK' ? t('bank.namePlaceholder') : t('bank.walletPlaceholder')}
              aria-label={t('bank.nameLabel')}
              className="w-full bg-transparent text-sm leading-body-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </FormRow>
          <FormRow icon={Banknote} error={errors.balance && t(`errors.${errors.balance.message}`)}>
            <MoneyInput control={control} name="balance" label={t('bank.balanceLabel')} />
          </FormRow>
        </FormCard>
        <SubmitButton label={t('bank.submit')} pending={pending} />
      </form>
    </div>
  )
}
