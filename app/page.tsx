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
        <ContentWrapper>
          <MainContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Dashboard</h1>
              </div>
              <NetWorthOverview userId={TEST_USER_ID} />
            </div>
          </MainContent>
          
          <SideContent>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-2 rounded hover:bg-gray-50">
                    View Recent Transactions
                  </button>
                  <button className="w-full text-left p-2 rounded hover:bg-gray-50">
                    Budget Overview
                  </button>
                  <button className="w-full text-left p-2 rounded hover:bg-gray-50">
                    Investment Summary
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">Financial Tips</h3>
                <div className="text-sm text-gray-600">
                  <p className="mb-2">💡 Track your spending regularly to stay on budget</p>
                  <p className="mb-2">📊 Review your portfolio allocation monthly</p>
                  <p>🎯 Set specific financial goals for better results</p>
                </div>
              </div>
            </div>
          </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}
