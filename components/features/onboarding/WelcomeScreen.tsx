'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent } from '@/components/ui/molecules/card'
import {
  Wallet,
  PieChart,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react'
import { DialogFooter } from '@/components/ui/molecules/dialog'

interface WelcomeScreenProps {
  userName: string
  onStart: () => void
  onSkip: () => void
}

export function WelcomeScreen({ userName, onStart, onSkip }: WelcomeScreenProps) {
  const t = useTranslations('onboarding.welcome')

  const features = [
    { icon: Wallet,    titleKey: 'features.track.title',    descKey: 'features.track.description' },
    { icon: PieChart,  titleKey: 'features.budgets.title',  descKey: 'features.budgets.description' },
    { icon: TrendingUp, titleKey: 'features.insights.title', descKey: 'features.insights.description' },
  ]

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">
          {t('heading', { name: userName })}
        </h1>
        <p className="text-md text-gray-600">
          {t('tagline')}
        </p>
      </div>

      {/* Features */}
      <div className="space-y-2">
        {/* <p className="text-lg text-gray-700 font-medium">
          {t('helpIntro')}
        </p> */}
        <div className="grid gap-4 text-left">
          {features.map((feature, index) => (
            <Card key={index} className="border-none bottom-b shadow-sm bg-white/80">
              <CardContent className="flex items-start gap-4 p-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t(feature.titleKey as Parameters<typeof t>[0])}</h3>
                  <p className="text-sm text-gray-600">{t(feature.descKey as Parameters<typeof t>[0])}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
        <DialogFooter>
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={onStart} className="gap-2">
              {t('startSetup')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost" onClick={onSkip}>
              {t('skipForNow')}
            </Button>
          </div>

          {/* Skip note */}
          <p className="text-sm text-muted-foreground">
            {t('skipNote')}
          </p>
      </DialogFooter>
    </div>
  )
}
