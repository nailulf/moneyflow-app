import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/molecules/card"
import { Button } from "@/components/ui/atoms/button"
import { Badge } from "@/components/ui/atoms/badge"
import { Lightbulb, TrendingUp, Shield, Target } from "lucide-react"
import { AdviceNavigation } from "@/components/TopNavigation"
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from "@/components/PageLayout"

export default function AdvicePage() {
  return (
    <>
      <AdviceNavigation />
      <PageLayout>
        <TopContent>
          <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Financial Goals
                </CardTitle>
                <CardDescription>Track your progress towards financial milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">House Down Payment</span>
                      <span className="text-sm text-muted-foreground">$45,000 / $60,000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Vacation Fund</span>
                      <span className="text-sm text-muted-foreground">$3,200 / $5,000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{width: '64%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Retirement</span>
                      <span className="text-sm text-muted-foreground">$125,000 / $1,000,000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-chart-5 h-2 rounded-full" style={{width: '12.5%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        </TopContent>
        <ContentWrapper>
        <MainContent>
          <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Score
            </CardTitle>
            <CardDescription>Your financial health rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">8.2</div>
              <p className="text-sm text-muted-foreground">out of 10</p>
              <Badge className="mt-2" variant="secondary">Excellent</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>Your risk tolerance profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Conservative</span>
                <span className="text-sm font-medium">30%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Moderate</span>
                <span className="text-sm font-medium">50%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Aggressive</span>
                <span className="text-sm font-medium">20%</span>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
          <div className="py-6">
          <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Quick Tips
            </CardTitle>
            <CardDescription>Personalized recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">Increase Emergency Fund</p>
                <p className="text-xs text-muted-foreground">Aim for 6 months of expenses</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <p className="text-sm font-medium">Diversify Portfolio</p>
                <p className="text-xs text-muted-foreground">Consider international stocks</p>
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
                <CardTitle>Recommended Actions</CardTitle>
                <CardDescription>Steps to improve your financial position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Reduce Credit Card Debt</p>
                      <p className="text-xs text-muted-foreground">Pay off high-interest debt first</p>
                      <Button size="sm" className="mt-2">Learn More</Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-chart-4 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Optimize Tax Strategy</p>
                      <p className="text-xs text-muted-foreground">Consider tax-advantaged accounts</p>
                      <Button size="sm" variant="outline" className="mt-2">Explore</Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Increase Savings Rate</p>
                      <p className="text-xs text-muted-foreground">Automate your savings</p>
                      <Button size="sm" variant="outline" className="mt-2">Set Up</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </>
  )
}