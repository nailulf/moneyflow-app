import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Calculator, Calendar, AlertCircle } from "lucide-react"
import { TaxNavigation } from "@/components/TopNavigation"
import { PageLayout, MainContent, SideContent } from "@/components/PageLayout"

export default function TaxPage() {
  return (
    <>
      <TaxNavigation />
      <PageLayout>
        <MainContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              2024 Tax Status
            </CardTitle>
            <CardDescription>Current year tax information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Filing Status</span>
                <Badge variant="secondary">Married Filing Jointly</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Estimated Tax Owed</span>
                <span className="text-sm font-medium">$8,450</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Withholdings YTD</span>
                <span className="text-sm font-medium">$12,200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Expected Refund</span>
                <span className="text-sm font-medium text-green-600">$3,750</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Tax Savings
            </CardTitle>
            <CardDescription>Optimization opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-green-600">$2,340</div>
              <p className="text-sm text-muted-foreground">Potential annual savings</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">401(k) Contribution</span>
                  <span className="text-sm font-medium">$1,200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">HSA Contribution</span>
                  <span className="text-sm font-medium">$840</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tax Loss Harvesting</span>
                  <span className="text-sm font-medium">$300</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Important Dates
            </CardTitle>
            <CardDescription>Tax calendar and deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Q4 Estimated Tax</p>
                  <p className="text-xs text-muted-foreground">January 15, 2025</p>
                </div>
                <Badge variant="outline">Upcoming</Badge>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">Tax Filing Deadline</p>
                  <p className="text-xs text-muted-foreground">April 15, 2025</p>
                </div>
                <Badge variant="secondary">Future</Badge>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">IRA Contribution</p>
                  <p className="text-xs text-muted-foreground">April 15, 2025</p>
                </div>
                <Badge variant="secondary">Future</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Tax-Advantaged Accounts</CardTitle>
            <CardDescription>Maximize your tax-deferred savings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">401(k)</h4>
                  <Badge variant="secondary">$23,000 limit</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Contribution</span>
                    <span className="text-sm font-medium">$18,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '78%'}}></div>
                  </div>
                  <p className="text-xs text-muted-foreground">$5,000 remaining</p>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">HSA</h4>
                  <Badge variant="secondary">$4,300 limit</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Contribution</span>
                    <span className="text-sm font-medium">$2,800</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                  <p className="text-xs text-muted-foreground">$1,500 remaining</p>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Traditional IRA</h4>
                  <Badge variant="secondary">$7,000 limit</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Contribution</span>
                    <span className="text-sm font-medium">$0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full" style={{width: '0%'}}></div>
                  </div>
                  <p className="text-xs text-muted-foreground">$7,000 remaining</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Tax Action Items
            </CardTitle>
            <CardDescription>Tasks to optimize your tax situation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-800">Quarterly Estimated Tax Due</p>
                    <p className="text-xs text-red-600">Payment due January 15, 2025</p>
                    <Button size="sm" className="mt-2" variant="outline">Calculate Payment</Button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-yellow-800">Maximize 401(k) Contribution</p>
                    <p className="text-xs text-yellow-600">Increase contribution to reach annual limit</p>
                    <Button size="sm" className="mt-2" variant="outline">Adjust Contribution</Button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-blue-800">Tax Loss Harvesting</p>
                    <p className="text-xs text-blue-600">Review investment losses for tax benefits</p>
                    <Button size="sm" className="mt-2" variant="outline">Review Portfolio</Button>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-green-800">Organize Tax Documents</p>
                    <p className="text-xs text-green-600">Prepare for tax season filing</p>
                    <Button size="sm" className="mt-2" variant="outline">Start Organizing</Button>
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
            {/* Additional tax planning content can go here */}
          </div>
        </SideContent>
      </PageLayout>
    </>
  )
}