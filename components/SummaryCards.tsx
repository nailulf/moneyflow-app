'use client'

import { useState, useEffect } from 'react'
import { Transaction } from '@/types/database'
import { getTotalBalance, getMonthlySpending, getMonthlyIncome, formatCurrency } from '@/lib/data-utils'
import { Card, CardContent } from '@/components/ui/card'


interface SummaryCardsProps {
  transactions: Transaction[]
}

export function SummaryCards({ transactions = [] }: SummaryCardsProps) {

  
  const initialTotalBalance = transactions.length > 0 ? getTotalBalance(transactions) : 0
  const initialMonthlyIncome = transactions.length > 0 ? getMonthlyIncome(transactions) : 0
  const initialNetThisMonth = transactions.length > 0 ? initialMonthlyIncome - getMonthlySpending(transactions) : 0

  const [totalBalance, setTotalBalance] = useState(initialTotalBalance)
  const [monthlyIncome, setMonthlyIncome] = useState(initialMonthlyIncome)
  const [netThisMonth, setNetThisMonth] = useState(initialNetThisMonth)

  // If transactions can change after initial render, keep a useEffect to update state
  // Otherwise, this useEffect can be removed if transactions are static after initial load
  useEffect(() => {
    setTotalBalance(getTotalBalance(transactions))
    const fixedDate = new Date('2024-01-15T12:00:00Z'); // Use a fixed date for consistent SSR/CSR
      setMonthlyIncome(getMonthlyIncome(transactions, fixedDate))
      setNetThisMonth(getMonthlyIncome(transactions, fixedDate) - getMonthlySpending(transactions, fixedDate))
  }, [transactions])
  


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
    <div className="grid grid-cols-1 gap-4">
      {cards.map((card, index) => {
        return (
          <Card key={index} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
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