import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, TrendingUp, Calculator, MapPin } from "lucide-react"
import { EquityNavigation } from "@/components/TopNavigation"
import { PageLayout, MainContent, SideContent, ContentWrapper } from "@/components/PageLayout"

export default function EquityPage() {
  return (
    <>
      <EquityNavigation />
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Value
            </CardTitle>
            <CardDescription>Current estimated market value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">$485,000</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm text-success">+3.2% this year</span>
              </div>
              <p className="text-xs text-muted-foreground">Last updated: March 2024</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Mortgage Balance</CardTitle>
            <CardDescription>Remaining loan amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">$285,000</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Interest Rate</span>
                  <span className="text-sm font-medium">3.25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Years Remaining</span>
                  <span className="text-sm font-medium">22</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Total Equity</CardTitle>
            <CardDescription>Your ownership stake</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-success">$200,000</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Equity Percentage</span>
                  <span className="text-sm font-medium">41.2%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{width: '41.2%'}}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Equity Options
            </CardTitle>
            <CardDescription>Ways to access your home equity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">Home Equity Line of Credit (HELOC)</h4>
                    <p className="text-sm text-muted-foreground">Flexible credit line</p>
                  </div>
                  <Badge variant="secondary">Variable Rate</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Available Credit</span>
                    <span className="text-sm font-medium">Up to $160,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Current Rate</span>
                    <span className="text-sm font-medium">6.75%</span>
                  </div>
                </div>
                <Button className="w-full mt-3" variant="outline">Learn More</Button>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">Cash-Out Refinance</h4>
                    <p className="text-sm text-muted-foreground">Replace current mortgage</p>
                  </div>
                  <Badge variant="outline">Fixed Rate</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Max Cash Out</span>
                    <span className="text-sm font-medium">Up to $140,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Current Rate</span>
                    <span className="text-sm font-medium">6.25%</span>
                  </div>
                </div>
                <Button className="w-full mt-3" variant="outline">Get Quote</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Neighborhood Trends
            </CardTitle>
            <CardDescription>Local market insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Recent Sales</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">123 Oak Street</p>
                      <p className="text-xs text-muted-foreground">3 bed, 2 bath • 1,850 sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$475,000</p>
                      <p className="text-xs text-muted-foreground">2 weeks ago</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">456 Pine Avenue</p>
                      <p className="text-xs text-muted-foreground">4 bed, 3 bath • 2,200 sq ft</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">$520,000</p>
                      <p className="text-xs text-muted-foreground">1 month ago</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Market Stats</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Median Price</span>
                    <span className="text-sm font-medium">$465,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Days on Market</span>
                    <span className="text-sm font-medium">18 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Price per Sq Ft</span>
                    <span className="text-sm font-medium">$245</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </MainContent>
        <SideContent>
          <div className="space-y-4">
            {/* Additional equity content can go here */}
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </>
  )
}