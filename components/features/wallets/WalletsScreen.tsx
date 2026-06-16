'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useGuestGuard } from '@/hooks/useGuestGuard'
import { fetchNetWorthData } from '@/lib/net-worth-utils'
import { splitAccounts } from '@/lib/home-utils'
import { groupAccounts } from '@/lib/wallets-utils'
import { NavUser } from '@/components/features/navigation/nav-user'
import { NetWorthStrip } from './NetWorthStrip'
import { AccountGroupCard } from './AccountGroupCard'
import { StickyScreenHeader } from '@/components/features/navigation/StickyScreenHeader'

interface WalletsScreenProps {
  onOpenAccount: (accountId: string) => void
}

/** Mobile Wallets & Accounts screen (design `EyNg9`). Desktop keeps the legacy grid. */
export function WalletsScreen({ onOpenAccount }: WalletsScreenProps) {
  const router = useRouter()
  const t = useTranslations('wallets')
  const { user } = useAuth()
  const { accounts } = useAccounts()
  const { guard } = useGuestGuard()

  const { data: netWorth } = useQuery({
    queryKey: ['home-net-worth', user?.id],
    queryFn: () => fetchNetWorthData(user!.id, '1Y'),
    enabled: !!user?.id,
  })

  const split = useMemo(() => splitAccounts(accounts), [accounts])
  const groups = useMemo(() => groupAccounts(accounts), [accounts])

  const userData = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    avatar: user?.user_metadata?.avatar_url || '/avatars/01.svg',
  }
  const baseCurrency = netWorth?.accounts?.[0]?.baseCurrency ?? accounts[0]?.currency ?? 'IDR'

  return (
    <div className="flex flex-col gap-5 pt-3 md:hidden">
      <StickyScreenHeader>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold leading-title-3 text-foreground">{t('title')}</h1>
          <p className="text-sm leading-body-sm text-muted-foreground">
            {t('subtitle', { accounts: split.assets.length, liabilities: split.liabilities.length })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => guard(() => router.push('/accounts/new'))}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm leading-none font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('add')}
          </button>
          <NavUser user={userData} />
        </div>
      </StickyScreenHeader>

      <NetWorthStrip
        netWorth={netWorth?.currentNetWorth ?? split.assetsTotal - split.liabilitiesTotal}
        assetsTotal={split.assetsTotal}
        liabilitiesTotal={split.liabilitiesTotal}
        currency={baseCurrency}
      />

      {groups.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm leading-body-sm text-muted-foreground shadow-card">
          {t('empty')}
        </p>
      ) : (
        groups.map((group) => (
          <AccountGroupCard key={group.key} groupKey={group.key} accounts={group.accounts} onOpen={onOpenAccount} />
        ))
      )}
    </div>
  )
}
