'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings } from 'lucide-react'
import { CategoryManager } from './CategoryManager'
import { AccountManager } from './AccountManager'

interface FinanceManagerProps {
  onUpdated?: () => void
  className?: string
}

function FinanceManagerInternal({ 
  onUpdated,
  className = ''
}: FinanceManagerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Finance
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>MANAGE FINANCE</SheetTitle>
          <SheetDescription>
            Manage your accounts and budget categories
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <Tabs defaultValue="accounts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="accounts" className="mt-4">
              <div className="space-y-4">
                <AccountManager 
                  onAccountUpdated={onUpdated}
                  className="w-full"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="categories" className="mt-4">
              <div className="space-y-4">
                <CategoryManager 
                  onCategoryUpdated={onUpdated}
                  className="w-full"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Wrapper component that handles client-side mounting
export function FinanceManager(props: FinanceManagerProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return <FinanceManagerInternal {...props} />
}
