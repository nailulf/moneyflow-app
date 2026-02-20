'use client'

import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent } from '@/components/ui/molecules/card'
import {
  Check,
  ArrowRight,
  Wallet,
  PieChart,
  Receipt,
  Upload
} from 'lucide-react'

interface CompletionScreenProps {
  summary: {
    accountsCreated: number
    categoriesCount: number
    budgetsCreated: number
    durationSeconds: number
  }
  onGoToDashboard: () => void
}

const NEXT_STEPS = [
  {
    icon: Receipt,
    title: 'Add your first transaction',
    description: 'Start tracking your spending by adding a transaction manually'
  },
  {
    icon: Upload,
    title: 'Upload a bank statement',
    description: 'Import transactions from your bank statement PDF'
  },
  {
    icon: PieChart,
    title: 'Review your budget',
    description: 'Monitor your spending and adjust allocations as needed'
  }
]

export function CompletionScreen({ summary, onGoToDashboard }: CompletionScreenProps) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Check className="h-10 w-10 text-green-600" strokeWidth={3} />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">
          You&apos;re All Set!
        </h1>
        <p className="text-xl text-gray-600">
          Your MoneyFlow workspace is ready to use
        </p>
      </div>

      {/* Setup Summary */}
      <Card className="bg-white/80">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Setup Summary</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">
                {summary.accountsCreated > 0
                  ? `${summary.accountsCreated} account${summary.accountsCreated > 1 ? 's' : ''} created`
                  : 'Accounts ready (add later)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">
                {summary.categoriesCount} categories configured
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-gray-700">
                {summary.budgetsCreated > 0
                  ? 'Budget created'
                  : 'Budget ready (create when you want)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="space-y-4 text-left">
        <h3 className="font-semibold text-gray-900 text-center">Next Steps</h3>
        <div className="grid gap-3">
          {NEXT_STEPS.map((step, index) => (
            <Card key={index} className="border-none shadow-sm bg-white/80">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="pt-4">
        <Button size="lg" onClick={onGoToDashboard} className="gap-2">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Duration note */}
      {summary.durationSeconds > 0 && (
        <p className="text-sm text-muted-foreground">
          Setup completed in {Math.ceil(summary.durationSeconds / 60)} minute{Math.ceil(summary.durationSeconds / 60) > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
