'use client'

import { useState, useEffect } from 'react'
import NetWorthOverview from '@/components/NetWorthOverview'
import { Transaction } from '@/types/database'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { AccountProvider } from '@/contexts/AccountContext'
import { AccountManager } from '@/components/AccountManager'

const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID!

export default function Home() {
  // In a real app, this would come from your database
  const [transactions, setTransactions] = useState<Transaction[]>([])

  return (
     <div className="flex flex-col h-full">
      
      
      
      <PageLayout>
        <TopContent>
              <NetWorthOverview userId={TEST_USER_ID} />
          </TopContent>
        <ContentWrapper>
        <MainContent children={undefined}>
          
        </MainContent>
        
        <SideContent children={undefined}>

        </SideContent>
        </ContentWrapper>
      </PageLayout>
        
      
      </div>
  )
}
