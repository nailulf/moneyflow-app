'use client'

import React from 'react'
import { SpendingNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { useTransactions } from '@/contexts/TransactionContext'
import { CategoryManager } from '@/components/CategoryManager'
import { AccountManager } from '@/components/AccountManager'
import { AccountProvider } from '@/contexts/AccountContext'
import CashFlowChart from '@/components/CashFlowChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getMonthlyData, calculateTotalIncome, calculateTotalSpending } from '@/lib/data-utils'

export default function CashFlowPage() {
  
  // Use shared transaction context
  const { transactions } = useTransactions()
  

  
  // Create date range for the last 12 months
  const dateRange = {
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 12, 1),
    to: new Date()
  }

  // Calculate summary data
  const monthlyData = getMonthlyData(transactions, 12)
  const totalIncome = calculateTotalIncome(transactions)
  const totalExpenses = calculateTotalSpending(transactions)
  const netCashFlow = totalIncome - totalExpenses
  

  
  return (
    <div className="flex flex-col h-full">
      <SpendingNavigation actionButton={
        <div className="flex items-center gap-2">
          <CategoryManager />
          <AccountProvider>
            <AccountManager />
          </AccountProvider>
        </div>
      } />
      
      <PageLayout>
        <TopContent>
          <CashFlowChart transactions={transactions} dateRange={dateRange} />
        </TopContent>
        
        <ContentWrapper>
          <MainContent>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Cash Flow Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalIncome)}
                    </div>
                    <div className="text-sm text-gray-600">Total Income</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </div>
                    <div className="text-sm text-gray-600">Total Expenses</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(netCashFlow)}
                    </div>
                    <div className="text-sm text-gray-600">Net Cash Flow</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MainContent>
          
          <SideContent>
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Monthly Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyData.slice(0, 6).map((data, index) => (
                    <div key={`month-${data.month}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-sm font-medium text-gray-700">
                        {data.month}
                      </span>
                      <span className={`text-sm font-semibold ${
                        data.net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(data.net)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}