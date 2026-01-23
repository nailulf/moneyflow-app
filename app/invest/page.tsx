import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InvestNavigation } from "@/components/TopNavigation"
import { PageLayout, MainContent, SideContent, ContentWrapper } from "@/components/PageLayout"
import { StackedBarChart } from "@/components/StackedBarChart"

export default function InvestPage() {
  return (
    <>
      <InvestNavigation />
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <StackedBarChart
              title="Investment Portfolio Performance"
              description="Revenue, expenses, and profit analysis"
              className="w-full"
              showTrend={true}
              trendValue={12.3}
              trendLabel="Portfolio growth up by 12.3% this year"
            />
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Available Cash</CardTitle>
                <CardDescription>Ready to invest</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$5,250.00</div>
                <Button className="mt-4 w-full">Invest Now</Button>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Recommended ETFs</CardTitle>
                <CardDescription>Diversified investment options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">VTI</p>
                      <p className="text-sm text-muted-foreground">Total Stock Market</p>
                    </div>
                    <Badge variant="secondary">Low Risk</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">VXUS</p>
                      <p className="text-sm text-muted-foreground">International Stocks</p>
                    </div>
                    <Badge variant="secondary">Medium Risk</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">BND</p>
                      <p className="text-sm text-muted-foreground">Total Bond Market</p>
                    </div>
                    <Badge variant="secondary">Low Risk</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Investment Goals</CardTitle>
                <CardDescription>Track your progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Emergency Fund</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '85%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Retirement</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '42%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>House Down Payment</span>
                      <span>67%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '67%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Market Overview</CardTitle>
                <CardDescription>Current market conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Market Indices</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">S&P 500</span>
                        <span className="text-sm font-medium text-success">+1.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">NASDAQ</span>
                        <span className="text-sm font-medium text-success">+0.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">DOW</span>
                        <span className="text-sm font-medium text-destructive">-0.3%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Market News</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Fed announces interest rate decision</p>
                      <p className="text-sm text-muted-foreground">Tech sector shows strong earnings</p>
                      <p className="text-sm text-muted-foreground">Energy stocks gain momentum</p>
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
                <CardTitle>Staking Opportunities</CardTitle>
                <CardDescription>Available staking options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Ethereum 2.0</p>
                      <p className="text-sm text-muted-foreground">4.2% APY</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Cardano</p>
                      <p className="text-sm text-muted-foreground">5.1% APY</p>
                    </div>
                    <Badge variant="outline">Available</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Polkadot</p>
                      <p className="text-sm text-muted-foreground">12.3% APY</p>
                    </div>
                    <Badge variant="outline">Available</Badge>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="outline">Explore Staking</Button>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </>
  )
}