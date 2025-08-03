import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, Shield, AlertTriangle } from "lucide-react"
import { EstatePlanningNavigation } from "@/components/TopNavigation"
import { PageLayout, MainContent, SideContent, ContentWrapper } from "@/components/PageLayout"

export default function EstatePlanningPage() {
  return (
    <>
      <EstatePlanningNavigation />
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Will Status
            </CardTitle>
            <CardDescription>Your last will and testament</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Updated</span>
                <Badge variant="outline">2023-06-15</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge className="bg-green-100 text-green-800">Valid</Badge>
              </div>
              <Button className="w-full mt-4">Update Will</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Beneficiaries
            </CardTitle>
            <CardDescription>People who will inherit your assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Sarah Johnson</p>
                  <p className="text-xs text-muted-foreground">Spouse - 60%</p>
                </div>
                <Badge variant="secondary">Primary</Badge>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Michael Johnson</p>
                  <p className="text-xs text-muted-foreground">Child - 25%</p>
                </div>
                <Badge variant="outline">Secondary</Badge>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Emma Johnson</p>
                  <p className="text-xs text-muted-foreground">Child - 15%</p>
                </div>
                <Badge variant="outline">Secondary</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Life Insurance
            </CardTitle>
            <CardDescription>Protection for your family</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold">$500,000</div>
                <p className="text-sm text-muted-foreground">Total Coverage</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Term Life</span>
                  <span className="text-sm font-medium">$400,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Whole Life</span>
                  <span className="text-sm font-medium">$100,000</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Estate Planning Checklist</CardTitle>
            <CardDescription>Essential documents and tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Last Will and Testament</p>
                  <p className="text-xs text-muted-foreground">Completed and notarized</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Power of Attorney</p>
                  <p className="text-xs text-muted-foreground">Financial and healthcare</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Living Trust</p>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Healthcare Directive</p>
                  <p className="text-xs text-muted-foreground">Needs attention</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Important Reminders
            </CardTitle>
            <CardDescription>Actions that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="font-medium text-sm text-yellow-800">Review Beneficiaries</p>
                <p className="text-xs text-yellow-600">Update retirement account beneficiaries after recent marriage</p>
                <Button size="sm" className="mt-2" variant="outline">Review Now</Button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-medium text-sm text-blue-800">Annual Review Due</p>
                <p className="text-xs text-blue-600">Schedule your annual estate plan review with attorney</p>
                <Button size="sm" className="mt-2" variant="outline">Schedule</Button>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="font-medium text-sm text-green-800">Tax Planning</p>
                <p className="text-xs text-green-600">Consider gift tax implications for large transfers</p>
                <Button size="sm" className="mt-2" variant="outline">Learn More</Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </MainContent>
        <SideContent>
          <div className="space-y-4">
            {/* Additional estate planning content can go here */}
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>
    </>
  )
}