import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard/dashboard'
import AppLayout from '@/components/layout/app-layout'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await (await supabase).auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  )
}