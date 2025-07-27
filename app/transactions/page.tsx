import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TransactionList from '@/components/transactions/TransactionList'
import AppLayout from '@/components/layout/app-layout'

export default async function TransactionsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <AppLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Transactions</h1>
        <TransactionList />
      </div>
    </AppLayout>
  )
}