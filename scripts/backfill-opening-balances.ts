// scripts/backfill-opening-balances.ts
// Usage:
//   npx tsx scripts/backfill-opening-balances.ts            # dry-run (prints, writes nothing)
//   npx tsx scripts/backfill-opening-balances.ts --apply    # applies updates
import { createClient } from '@supabase/supabase-js'
import { transactionEffect, type LedgerTxn } from '../lib/account-balance'

const apply = process.argv.includes('--apply')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(url, key)

async function main() {
  const { data: accounts } = await db.from('accounts').select('id, name, type, balance, user_id').eq('is_active', true)
  const { data: adjustments } = await db.from('account_balance_adjustments').select('account_id, new_balance, created_at')
  const lastAdjust = new Map<string, { new_balance: number; created_at: string }>()
  for (const a of adjustments || []) {
    const prev = lastAdjust.get(a.account_id)
    if (!prev || a.created_at > prev.created_at) lastAdjust.set(a.account_id, a)
  }

  let changed = 0
  for (const acc of accounts || []) {
    // INVESTMENT accounts are holdings-driven (balance maintained by a separate trigger); never backfill them.
    if (acc.type === 'INVESTMENT') continue

    const { data: txns } = await db.from('transactions')
      .select('amount, type, date, account_id, to_account_id, currency')
      .or(`account_id.eq.${acc.id},to_account_id.eq.${acc.id}`)
    const accountTxns = (txns || []) as LedgerTxn[]

    let newOpening: number
    const adj = lastAdjust.get(acc.id)
    if (adj) {
      // Anchor on the last human-asserted balance: opening so that
      // opening + Σ(effects of tx on/before adjust date) == new_balance.
      const upTo = new Date(adj.created_at)
      const sumUpTo = accountTxns
        .filter(t => new Date(t.date) <= upTo)
        .reduce((s, t) => s + transactionEffect(t, acc.id), 0)
      newOpening = adj.new_balance - sumUpTo
    } else {
      // Never adjusted: stored == opening_orig + Σ(income−expense) (trigger effect, no transfers).
      const incomeExpense = accountTxns
        .filter(t => t.type === 'INCOME' || t.type === 'EXPENSE')
        .reduce((s, t) => s + transactionEffect(t, acc.id), 0)
      newOpening = acc.balance - incomeExpense
    }
    const rounded = Math.round(newOpening * 100) / 100
    if (rounded !== acc.balance) {
      changed++
      console.log(`${acc.name} (${acc.id}): ${acc.balance} → opening ${rounded}`)
      if (apply) {
        await db.from('accounts').update({ balance: rounded }).eq('id', acc.id)
      }
    }
  }
  console.log(`${apply ? 'APPLIED' : 'DRY-RUN'} — ${changed} account(s) ${apply ? 'updated' : 'would change'}`)
}
main().then(() => process.exit(0))
