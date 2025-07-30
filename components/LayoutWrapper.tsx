'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SideNavigation } from '@/components/SideNavigation'
import { UserNav } from '@/components/UserNav'
import { Toaster } from '@/components/ui/sonner'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background font-sans antialiased">
      <SideNavigation collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn(
        'flex flex-col flex-1 transition-all duration-300 ease-in-out',
        collapsed ? 'ml-20' : 'ml-64'
      )}>
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-end">
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}