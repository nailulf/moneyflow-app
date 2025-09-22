'use client'

import { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import { MonthlyChart } from '@/components/MonthlyChart'
import NetWorthCard from '@/components/NetWorthCard'
import { generateMockTransactions } from '@/lib/mock-data'
import { Transaction } from '@/types/database'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'

export default function Home() {
  // In a real app, this would come from your database
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(generateMockTransactions(12))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <NetWorthCard 
              onAddAssets={() => {
                // TODO: Implement add assets functionality
              }}
            />
        </MainContent>
        
        <SideContent>
          <div className="space-y-6">            
            <div>
              <SummaryCards transactions={transactions} />
            </div>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
