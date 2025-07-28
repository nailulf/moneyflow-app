'use client'

import { useState, useEffect } from 'react'
import { Transaction } from '@/types/database'
import { getTotalBalance, getMonthlySpending, getMonthlyIncome, formatCurrency } from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react'

interface SummaryCardsProps {
  transactions: Transaction[]
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  const totalBalance = getTotalBalance(transactions)
  const monthlySpending = getMonthlySpending(transactions)
  const monthlyIncome = getMonthlyIncome(transactions)
  const netThisMonth = monthlyIncome - monthlySpending
  
  if (!isClient) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Value',
      value: formatCurrency(totalBalance),
      subtitle: `${formatCurrency(totalBalance)} invested`,
      change: totalBalance >= 0 ? '+2.4%' : '-1.2%',
      changeColor: totalBalance >= 0 ? 'text-green-600' : 'text-red-600',
      icon: '💰'
    },
    {
      title: 'Total return',
      value: formatCurrency(netThisMonth),
      subtitle: `${netThisMonth >= 0 ? '+' : ''}${monthlyIncome > 0 ? ((netThisMonth / monthlyIncome) * 100).toFixed(1) : '0.0'}%`,
      change: '26.4%',
      changeColor: 'text-green-600',
      icon: '📈'
    },
    {
      title: 'Positive Income',
      value: '11.74%',
      subtitle: `${formatCurrency(monthlyIncome)} monthly`,
      change: '+4.7%',
      changeColor: 'text-green-600',
      icon: '💚'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card, index) => {
        return (
          <Card key={index} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{card.icon}</span>
                <span className="text-sm font-medium text-gray-600">
                  {card.title}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-gray-900">
                  {card.value}
                </div>
                <div className="text-xs text-gray-500">
                  {card.subtitle}
                </div>
                <div className={`text-xs font-medium ${card.changeColor}`}>
                  {card.change}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}