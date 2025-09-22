'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { NavUser } from '@/components/nav-user'
import { Toaster } from '@/components/ui/sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { usePathname } from 'next/navigation'
import { AccountProvider } from '@/contexts/AccountContext'
import { CategoryProvider } from '@/contexts/CategoryContext'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Test user ID for development - in production this would come from authentication
  const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!
  


  return (
    <SidebarProvider>
      <AccountProvider userId={TEST_USER_ID}>
        <CategoryProvider userId={TEST_USER_ID}>
          <AppSidebar />
          <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
            </div>
            <h1 className="text-xl font-semibold">
                {
                  pathname === '/spending' ? 'Spending' :
                  pathname.startsWith('/spending') ? 'Spending' :
                  pathname === '/portfolio' ? 'Portfolio' :
                  pathname.startsWith('/portfolio') ? 'Portfolio' :
                  pathname === '/invest' ? 'Invest' :
                  pathname === '/advice' ? 'Advice' :
                  pathname === '/tax' ? 'Tax' :
                  pathname === '/equity' ? 'Equity' :
                  pathname === '/estate-planning' ? 'Estate Planning' :
                  'Dashboard'
                }
            </h1>
            <div className="ml-auto px-4">
              <NavUser user={{
                name: "shadcn",
                email: "shadcn@example.com",
                avatar: "/avatars/01.svg"
              }} />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-[100vh] flex-1 rounded-xl md:min-h-min">
              {children}
            </div>
          </div>
        </SidebarInset>
        </CategoryProvider>
      </AccountProvider>
      <Toaster />
    </SidebarProvider>
  )
}