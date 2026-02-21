import { PortfolioNavigation } from '@/components/features/navigation/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"


interface AnalyticsData {
  metric: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
}

const analyticsData: AnalyticsData[] = [
  {
    metric: "Total Return",
    value: "+$12,450",
    change: "+8.2%",
    changeType: "positive"
  },
  {
    metric: "Annualized Return",
    value: "12.5%",
    change: "+2.1%",
    changeType: "positive"
  },
  {
    metric: "Volatility",
    value: "15.8%",
    change: "-1.2%",
    changeType: "positive"
  },
  {
    metric: "Sharpe Ratio",
    value: "1.42",
    change: "+0.15",
    changeType: "positive"
  },
  {
    metric: "Max Drawdown",
    value: "-8.5%",
    change: "+2.1%",
    changeType: "positive"
  },
  {
    metric: "Beta",
    value: "0.95",
    change: "-0.05",
    changeType: "positive"
  }
]

const sectorAllocation = [
  { sector: "Technology", percentage: 45, value: 56250 },
  { sector: "Healthcare", percentage: 20, value: 25000 },
  { sector: "Financial", percentage: 15, value: 18750 },
  { sector: "Consumer", percentage: 12, value: 15000 },
  { sector: "Energy", percentage: 8, value: 10000 }
]

export default function PortfolioAnalyticsPage() {
  return (
    <div className="flex flex-col h-full">
      <PortfolioNavigation />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Analytics</h2>
              <p className="text-muted-foreground">Advanced portfolio performance metrics and analysis</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analyticsData.map((data) => (
                <Card key={data.metric} className="rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {data.metric}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.value}</div>
                    <div className={`text-sm font-medium ${
                      data.changeType === 'positive' ? 'text-success' : 
                      data.changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {data.change} vs last period
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>Distribution across different sectors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectorAllocation.map((sector) => (
                    <div key={sector.sector} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{sector.sector}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{sector.percentage}%</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ${sector.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all" 
                          style={{ width: `${sector.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>Portfolio risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className="font-medium text-chart-5">Medium</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Diversification</span>
                    <span className="font-medium text-success">Good</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Correlation</span>
                    <span className="font-medium">0.72</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Performance vs Benchmark</CardTitle>
                <CardDescription>Comparison with S&P 500</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Portfolio</span>
                    <span className="font-medium text-success">+8.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">S&P 500</span>
                    <span className="font-medium">+6.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Outperformance</span>
                    <span className="font-medium text-success">+1.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </div>
  )
}