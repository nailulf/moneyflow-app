'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Home, Upload, CreditCard, Settings, LogOut } from 'lucide-react'

export default function Navigation() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              MoneyFlow
            </Link>
            <div className="flex space-x-4">
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/transactions" className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600">
                <CreditCard className="h-4 w-4" />
                Transactions
              </Link>
              <Link href="/upload" className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600">
                <Upload className="h-4 w-4" />
                Upload
              </Link>
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}