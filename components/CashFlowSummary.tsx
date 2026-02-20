'use client'

import { useMemo } from 'react'
import { Transaction } from '@/types/database'
import { formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/molecules/card'

interface CashFlowSummaryProps {
  transactions: Transaction[]
}

export function CashFlowSummary({
  transactions,
}: CashFlowSummaryProps) {
  const { totalIncome, totalSpending, netCashFlow } = useMemo(() => {
    let totalIncome = 0
    let totalSpending = 0
    for (const t of transactions) {
      if (t.type === 'INCOME') {
        totalIncome += Math.abs(t.amount)
      } else if (t.type === 'EXPENSE') {
        totalSpending += Math.abs(t.amount)
      }
    }
    return { totalIncome, totalSpending, netCashFlow: totalIncome - totalSpending }
  }, [transactions])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <span>Cash Flow</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col divide-y">
          <div>
            <div className="flex items-center justify-between gap-4 py-1">
              <span className="text-sm leading-body-sm text-muted-foreground whitespace-nowrap">
                Income
              </span>
              <span className="text-sm leading-body-sm font-normal text-success tabular-nums whitespace-nowrap">
                {formatCurrency(totalIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-1">
              <span className="text-sm leading-body-sm text-muted-foreground whitespace-nowrap">
                Spending
              </span>
              <span className="text-sm leading-body-sm font-normal text-destructive tabular-nums whitespace-nowrap">
                {formatCurrency(totalSpending)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm leading-body-sm text-muted-foreground whitespace-nowrap">
              Net Cash Flow
            </span>
            <span
              className={`text-sm leading-body-sm font-normal tabular-nums whitespace-nowrap ${
                netCashFlow >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {formatCurrency(netCashFlow)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
