import { PortfolioNavigation } from '@/components/TopNavigation'
import { PageLayout, MainContent, SideContent, ContentWrapper } from '@/components/PageLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Holding {
  symbol: string
  name: string
  shares: number
  currentPrice: number
  totalValue: number
  dayChange: number
  dayChangePercent: number
  allocation: number
}

const mockHoldings: Holding[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 50,
    currentPrice: 175.20,
    totalValue: 8760,
    dayChange: 2.50,
    dayChangePercent: 1.45,
    allocation: 35.2
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 30,
    currentPrice: 380.50,
    totalValue: 11415,
    dayChange: -5.20,
    dayChangePercent: -1.35,
    allocation: 45.8
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    shares: 15,
    currentPrice: 142.80,
    totalValue: 2142,
    dayChange: 1.80,
    dayChangePercent: 1.28,
    allocation: 8.6
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    shares: 10,
    currentPrice: 258.90,
    totalValue: 2589,
    dayChange: -8.50,
    dayChangePercent: -3.18,
    allocation: 10.4
  }
]

export default function PortfolioHoldingsPage() {
  const totalPortfolioValue = mockHoldings.reduce((sum, holding) => sum + holding.totalValue, 0)
  const totalDayChange = mockHoldings.reduce((sum, holding) => sum + holding.dayChange * holding.shares, 0)
  const totalDayChangePercent = (totalDayChange / totalPortfolioValue) * 100

  return (
    <div className="flex flex-col h-full">
      <PortfolioNavigation />
      
      <PageLayout>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-2">Holdings</h2>
              <p className="text-muted-foreground">Detailed view of your investment positions</p>
            </div>
            
            <div className="space-y-4">
              {mockHoldings.map((holding) => (
                <Card key={holding.symbol} className="rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{holding.symbol}</h3>
                            <Badge variant="outline">{holding.allocation.toFixed(1)}%</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{holding.name}</p>
                          <p className="text-xs text-muted-foreground">{holding.shares} shares</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold">${holding.totalValue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">${holding.currentPrice.toFixed(2)} per share</div>
                        <div className={`text-sm font-medium ${
                          holding.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {holding.dayChangePercent >= 0 ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%
                          ({holding.dayChangePercent >= 0 ? '+' : ''}${holding.dayChange.toFixed(2)})
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </MainContent>
        
        <SideContent>
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Portfolio Summary</CardTitle>
                <CardDescription>Total holdings overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold">${totalPortfolioValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day Change</span>
                    <span className={`font-medium ${
                      totalDayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {totalDayChangePercent >= 0 ? '+' : ''}{totalDayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Positions</span>
                    <span className="font-medium">{mockHoldings.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Best performing holdings today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockHoldings
                    .filter(h => h.dayChangePercent > 0)
                    .sort((a, b) => b.dayChangePercent - a.dayChangePercent)
                    .slice(0, 3)
                    .map((holding) => (
                      <div key={holding.symbol} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{holding.symbol}</span>
                        <span className="text-sm text-green-600">+{holding.dayChangePercent.toFixed(2)}%</span>
                      </div>
                    ))
                  }
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