'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Home, Upload, CreditCard, Settings, LogOut, PieChart } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <div className="h-screen w-64 bg-gray-900 text-white fixed left-0 top-0 flex flex-col">
      <div className="p-6">
        <Link href="/dashboard" className="text-2xl font-bold text-blue-400 flex items-center gap-2">
          <PieChart className="h-6 w-6" />
          MoneyFlow
        </Link>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              href="/transactions" 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/transactions') ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <CreditCard className="h-5 w-5" />
              Transactions
            </Link>
          </li>
          <li>
            <Link 
              href="/upload" 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/upload') ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <Upload className="h-5 w-5" />
              Upload
            </Link>
          </li>
          <li>
            <Link 
              href="/settings" 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/settings') ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 p-3 w-full rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}