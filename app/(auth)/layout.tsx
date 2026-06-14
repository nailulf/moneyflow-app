
import Image from "next/image"
import { Receipt, Banknote, WavesIcon, Coins, HelpingHand, Star } from "lucide-react"
import { getTranslations } from 'next-intl/server'
import { AuthLanguageToggle } from '@/components/auth/auth-language-toggle'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('auth.layout')

  return (
    <div className="grid min-h-svh md:grid-cols-[40%_60%] lg:grid-cols-[30%_70%]">
      {/* Left Panel - Dark Green */}
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-auth-sidebar text-auth-sidebar-foreground dark">
        <div className="flex justify-between items-center">
          <a href="#" className="flex items-center gap-2 font-medium text-auth-sidebar-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <Image src="/icons/icon_.png" alt="Teman Tumbuh" width={28} height={28} className="object-contain" />
            </div>
            Teman Tumbuh
          </a>
          <AuthLanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
        <div className="text-[10px] text-auth-sidebar-foreground/40 mt-auto">
          {t('termsPrefix')}{' '}
          <a href="#" className="underline hover:text-auth-sidebar-foreground">{t('termsOfService')}</a>
          {' '}{t('and')}{' '}
          <a href="#" className="underline hover:text-auth-sidebar-foreground">{t('privacyPolicy')}</a>.
        </div>
      </div>

      {/* Right Panel - Beige Background with Green Card */}
      <div className="relative hidden md:flex items-center justify-center bg-auth-card p-8 xl:p-12">
        {/* Main Green Card */}
        <div className="relative w-full max-w-4xl h-full max-h-[900px] bg-auth-accent rounded-[32px] overflow-hidden flex flex-col items-center justify-center p-12 text-center shadow-xl">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:64px_64px] opacity-10 pointer-events-none"></div>

          <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-serif text-auth-accent-foreground mb-16 leading-tight max-w-3xl">
            {t('tagline')}
          </h2>

          {/* Icons Grid */}
          <div className="relative grid grid-cols-3 gap-6 md:gap-8 max-w-3xl">
            <FeatureIcon icon={Receipt} label={t('features.uploadExpenses')} />
            <FeatureIcon icon={Banknote} label={t('features.manageBudgets')} />
            <FeatureIcon icon={WavesIcon} label={t('features.cashFlowClarity')} />
            <FeatureIcon icon={Coins} label={t('features.networthTracker')} />
            <FeatureIcon icon={HelpingHand} label={t('features.connectCFP')} />
            <FeatureIcon icon={Star} label={t('features.aiPowered')} />
          </div>

          <p className="relative mt-16 text-auth-accent-foreground text-lg font-medium opacity-90 max-w-2xl">
            {t('ctaText')}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureIcon({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-auth-accent-foreground/10 group-hover:bg-auth-accent-foreground/20 transition-colors border border-auth-accent-foreground/5">
        <Icon className="h-8 w-8 text-auth-accent-foreground" strokeWidth={1.5} />
      </div>
      <span className="text-sm font-semibold text-auth-accent-foreground leading-tight max-w-[100px]">{label}</span>
    </div>
  )
}
