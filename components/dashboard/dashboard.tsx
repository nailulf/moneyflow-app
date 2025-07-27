'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { categories, categoryColors } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Tag, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  category: string
}

interface CategoryData {
  name: string
  value: number
  color: string
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setTransactions(data || [])
    } catch (error: any) {
      console.error('Error fetching transactions:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const totalSpending = currentMonthTransactions
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const categoryData: CategoryData[] = categories.map(category => {
    const categoryTransactions = currentMonthTransactions.filter(t => t.category === category)
    const total = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return {
      name: category,
      value: total,
      color: categoryColors[category].split(' ')[0].replace('bg-', '#')
    }
  }).filter(item => item.value > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your financial overview</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Total</p>
                <h3 className="text-2xl font-bold mt-1">${totalSpending.toFixed(2)}</h3>
                <p className="text-xs text-muted-foreground mt-1">For {new Date().toLocaleString('default', { month: 'long' })}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <h3 className="text-2xl font-bold mt-1">{currentMonthTransactions.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <h3 className="text-2xl font-bold mt-1">{categoryData.length}</h3>
                <p className="text-xs text-muted-foreground mt-1">Active categories</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average</p>
                <h3 className="text-2xl font-bold mt-1">
                  ${currentMonthTransactions.length > 0 
                    ? (totalSpending / currentMonthTransactions.length).toFixed(2) 
                    : '0.00'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(props) => {
                      return `${props.name}: $${props.value?.toFixed(2) ?? '0.00'}`
                    }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="outline" size="sm" className="h-8">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <span>{new Date(transaction.date).toLocaleDateString()}</span>
                        <span className="inline-block h-1 w-1 rounded-full bg-muted mx-1"></span>
                        <span>{transaction.category}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold flex items-center",
                      transaction.amount < 0 ? "text-destructive" : "text-green-500"
                    )}>
                      {transaction.amount < 0 ? (
                        <ArrowDownRight className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                      )}
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No transactions available
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/transactions'}>
              View all transactions
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}