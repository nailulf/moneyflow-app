'use client'

import { useState, useEffect } from 'react'
import { PageLayout, MainContent, SideContent, TopContent, ContentWrapper } from '@/components/PageLayout'
import { SpendingChart } from '@/components/SpendingChart'
import { SpendingVsBudgetChart } from '@/components/SpendingVsBudgetChart'
// import { CashFlowBreakdown } from '@/components/CashFlowBreakdown'
import { StackedBarChart } from '@/components/StackedBarChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateMockTransactions } from '@/lib/mock-data'
import { stackedBarChartData, stackedBarChartConfig } from '@/lib/mock-chart-data'
import { RefreshCw, BarChart3, PieChart, TrendingUp, DollarSign } from 'lucide-react'

// Stable currency formatting to avoid hydration mismatches
const formatCurrencyStable = (amount: number): string => {
  return `Rp ${Math.round(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

// Import the TransformedBudget interface
interface TransformedBudget {
  id: string
  name: string
  totalAmount: number
  period: 'monthly' | 'yearly'
  categories: {
    id: string
    category: string
    budgetAmount: number
    spentAmount: number
    status: 'good' | 'warning' | 'over'
    color: string
  }[]
}

export default function ChartsPage() {
  const [mockTransactions] = useState(() => generateMockTransactions(12))
  const [refreshKey, setRefreshKey] = useState(0)
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side rendering to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Create mock budgets data that matches TransformedBudget interface
  const mockBudgets: TransformedBudget[] = [
    {
      id: '1',
      name: 'Monthly Budget',
      totalAmount: 5000000,
      period: 'monthly' as const,
      categories: [
        {
          id: '1',
          category: 'Food & Dining',
          budgetAmount: 1500000,
          spentAmount: 1200000,
          status: 'good' as const,
          color: '#8884d8'
        },
        {
          id: '2', 
          category: 'Transportation',
          budgetAmount: 800000,
          spentAmount: 900000,
          status: 'over' as const,
          color: '#82ca9d'
        },
        {
          id: '3',
          category: 'Entertainment',
          budgetAmount: 600000,
          spentAmount: 450000,
          status: 'good' as const,
          color: '#ffc658'
        },
        {
          id: '4',
          category: 'Shopping',
          budgetAmount: 1000000,
          spentAmount: 850000,
          status: 'warning' as const,
          color: '#ff7300'
        }
      ]
    },
    {
      id: '2',
      name: 'Yearly Budget',
      totalAmount: 60000000,
      period: 'yearly' as const,
      categories: [
        {
          id: '5',
          category: 'Food & Dining',
          budgetAmount: 18000000,
          spentAmount: 14400000,
          status: 'good' as const,
          color: '#8884d8'
        },
        {
          id: '6',
          category: 'Transportation',
          budgetAmount: 9600000,
          spentAmount: 10800000,
          status: 'over' as const,
          color: '#82ca9d'
        }
      ]
    }
  ]

  return (
    <PageLayout>
      <TopContent>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">Chart Showcase</CardTitle>
              <CardDescription className="text-base">
                Interactive demonstration of all chart components with live mock data
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <BarChart3 className="w-4 h-4 mr-1" />
                4 Components
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshData}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </Button>
            </div>
          </CardHeader>
        </Card>
      </TopContent>

      <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            {/* Spending vs Budget Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <CardTitle>Spending vs Budget Comparison</CardTitle>
                </div>
                <CardDescription>
                  Monthly spending compared to budget allocations with variance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isClient ? (
                  <SpendingVsBudgetChart
                    key={`spending-budget-${refreshKey}`}
                    transactions={mockTransactions}
                    budgets={mockBudgets}
                    isLoading={false}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cash Flow Breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  <CardTitle>Cash Flow Breakdown</CardTitle>
                </div>
                <CardDescription>
                  Comprehensive analysis of income, expenses, and budget performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* <CashFlowBreakdown transactions={mockTransactions} /> */}
                <div className="p-8 text-center text-gray-500">
                  <p>Cash Flow Breakdown temporarily disabled to prevent hydration issues</p>
                  <p className="text-sm mt-2">This component requires budget context integration</p>
                </div>
              </CardContent>
            </Card>

            {/* Stacked Bar Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <CardTitle>Financial Overview</CardTitle>
                </div>
                <CardDescription>
                  Monthly breakdown of income, expenses, and savings trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isClient ? (
                  <StackedBarChart
                    key={`stacked-${refreshKey}`}
                    data={stackedBarChartData}
                    config={stackedBarChartConfig}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </MainContent>

        <SideContent>
          <div className="space-y-4">
            {/* Spending Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg">Category Spending</CardTitle>
                </div>
                <CardDescription>
                  Expense distribution by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isClient ? (
                  <SpendingChart
                    key={`spending-${refreshKey}`}
                    transactions={mockTransactions}
                  />
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    Loading chart...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chart Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Data Sources</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Mock transactions ({mockTransactions.length} records)</li>
                    <li>• Generated budget data</li>
                    <li>• 12-month historical data</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Interactive tooltips</li>
                    <li>• Responsive design</li>
                    <li>• Real-time data updates</li>
                    <li>• Category-based filtering</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Technologies</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Recharts</Badge>
                    <Badge variant="outline" className="text-xs">React</Badge>
                    <Badge variant="outline" className="text-xs">TypeScript</Badge>
                    <Badge variant="outline" className="text-xs">Tailwind</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
      </ContentWrapper>
    </PageLayout>
  )
}