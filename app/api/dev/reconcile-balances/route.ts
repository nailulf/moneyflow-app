import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDevToolsEnabled } from '@/lib/utils/environment'
import { computeAccountBalance, transactionEffect, type LedgerTxn } from '@/lib/account-balance'

export async function GET() {
  if (!isDevToolsEnabled()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development and preview environments' },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, balance, currency')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { data: txns } = await supabase
    .from('transactions')
    .select('amount, type, date, account_id, to_account_id, currency')
    .eq('user_id', user.id)

  const report = (accounts || []).map(acc => {
    const isInvestment = acc.type === 'INVESTMENT'

    if (isInvestment) {
      // INVESTMENT account balances are holdings-driven, not transaction-derived.
      // The one-time backfill (Task 11) does NOT apply to these accounts.
      return {
        id: acc.id,
        name: acc.name,
        currency: acc.currency,
        storedBalance: acc.balance,
        incomeExpenseEffect: null,
        proposedOpening: acc.balance,
        computedCurrentAfterBackfill: acc.balance,
        delta: 0,
        excludedFromBackfill: true,
      }
    }

    const accountTxns = (txns || []).filter(
      t => t.account_id === acc.id || t.to_account_id === acc.id
    ) as LedgerTxn[]

    const incomeExpenseEffect = accountTxns
      .filter(t => t.type === 'INCOME' || t.type === 'EXPENSE')
      .reduce((s, t) => s + transactionEffect(t, acc.id), 0)

    // Proposed clean opening so that opening + Σ(all effects, incl. transfers) = storedBalance
    const proposedOpening = acc.balance - incomeExpenseEffect

    const computedCurrent = computeAccountBalance({
      accountId: acc.id,
      opening: proposedOpening,
      transactions: accountTxns,
    })

    return {
      id: acc.id,
      name: acc.name,
      currency: acc.currency,
      storedBalance: acc.balance,
      incomeExpenseEffect,
      proposedOpening,
      computedCurrentAfterBackfill: computedCurrent,
      delta: computedCurrent - acc.balance,
      excludedFromBackfill: false,
    }
  })

  return NextResponse.json({ report })
}
