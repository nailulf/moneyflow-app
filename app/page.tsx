'use client'

import { useState, useEffect } from 'react'
import { SummaryCards } from '@/components/SummaryCards'
import NetWorthOverview from '@/components/NetWorthOverview'
import { generateMockTransactions } from '@/lib/mock-data'
import { Transaction } from '@/types/database'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'

export default function Home() {
  // In a real app, this would come from your database
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setTransactions(generateMockTransactions(12))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <PageLayout>
        <TopContent>
          <NetWorthOverview 
            onAddAccount={() => {
              // TODO: Implement add account functionality
            }}
          />
        </TopContent>
        
        <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              {/* Additional dashboard content can go here */}
            </div>
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
