import { PortfolioNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PortfolioPage() {
  return (
    <div className="flex flex-col h-full">
      <PortfolioNavigation />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Portfolio Overview</h2>
              <p className="text-muted-foreground">Track your investment performance and allocation</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Total Portfolio Value</CardTitle>
                  <CardDescription>Your current investment portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$125,430.50</div>
                  <p className="text-xs text-muted-foreground">+2.5% from last month</p>
                </CardContent>
              </Card>
              
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                  <CardDescription>Year-to-date returns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+8.2%</div>
                  <p className="text-xs text-muted-foreground">Outperforming market by 1.5%</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest portfolio activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">AAPL - Apple Inc.</p>
                      <p className="text-sm text-muted-foreground">Bought 10 shares</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$1,750.00</p>
                      <p className="text-sm text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">MSFT - Microsoft Corp.</p>
                      <p className="text-sm text-muted-foreground">Sold 5 shares</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$1,650.00</p>
                      <p className="text-sm text-muted-foreground">1 week ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>Distribution of your investments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stocks</span>
                    <span className="text-sm font-medium">65%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Bonds</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cash</span>
                    <span className="text-sm font-medium">10%</span>
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