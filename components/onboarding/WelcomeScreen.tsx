'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Wallet,
  PieChart,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react'

interface WelcomeScreenProps {
  userName: string
  onStart: () => void
  onSkip: () => void
}

const FEATURES = [
  {
    icon: Wallet,
    title: 'Track expenses across all accounts',
    description: 'Connect your bank accounts, credit cards, and e-wallets in one place'
  },
  {
    icon: PieChart,
    title: 'Create budgets that actually work',
    description: 'Set spending limits and get alerts before you overspend'
  },
  {
    icon: TrendingUp,
    title: 'Understand where your money goes',
    description: 'Visual insights and reports to help you make better financial decisions'
  }
]

export function WelcomeScreen({ userName, onStart, onSkip }: WelcomeScreenProps) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Welcome to MoneyFlow, {userName}!
        </h1>
        <p className="text-xl text-gray-600">
          Your Personal Finance Companion
        </p>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <p className="text-lg text-gray-700 font-medium">
          We&apos;ll help you:
        </p>
        <div className="grid gap-4 text-left">
          {FEATURES.map((feature, index) => (
            <Card key={index} className="border-none shadow-sm bg-white/80">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Time estimate */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">Setup takes about 3 minutes</span>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button size="lg" onClick={onStart} className="gap-2">
          Start Setup
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
      </div>

      {/* Skip note */}
      <p className="text-sm text-muted-foreground">
        You can always complete the setup later from your dashboard
      </p>
    </div>
  )
}
