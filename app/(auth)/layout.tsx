
import { GalleryVerticalEnd, Receipt, Banknote, CreditCard, Users, FileText, Send, ChartBar, HelpingHand, Coins, Waves, WavesIcon, Star } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh md:grid-cols-[40%_60%] lg:grid-cols-[30%_70%]">
      {/* Left Panel - Dark Green */}
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-auth-sidebar text-auth-sidebar-foreground dark">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium text-auth-sidebar-foreground">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-auth-accent text-auth-accent-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            MoneyFlow
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
        <div className="text-[10px] text-auth-sidebar-foreground/40 mt-auto">
          By logging in, you agree to our <a href="#" className="underline hover:text-auth-sidebar-foreground">terms of service</a> and <a href="#" className="underline hover:text-auth-sidebar-foreground">privacy policy</a>.
        </div>
      </div>

      {/* Right Panel - Beige Background with Green Card */}
      <div className="relative hidden md:flex items-center justify-center bg-auth-card p-8 xl:p-12">
        {/* Main Green Card */}
        <div className="relative w-full max-w-4xl h-full max-h-[900px] bg-auth-accent rounded-[32px] overflow-hidden flex flex-col items-center justify-center p-12 text-center shadow-xl">
          {/* Background Pattern/Texture (Optional subtle gradient or shapes) */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:64px_64px] opacity-10 pointer-events-none"></div>
          
          <h2 className="relative text-4xl md:text-5xl lg:text-6xl font-serif text-auth-accent-foreground mb-16 leading-tight max-w-3xl">
            Know where your money goes—and where it can take you.
          </h2>
          {/* <h3 className="relative text-4xl md:text-5xl lg:text-6xl font-serif text-auth-accent-foreground mb-16 leading-tight max-w-3xl">
            See every expense clearly, so your money feels under control.
            </h3> */}

          {/* Icons Grid */}
          <div className="relative grid grid-cols-3 gap-6 md:gap-8 max-w-3xl">
            <FeatureIcon icon={Receipt} label="Upload Expenses" />
            <FeatureIcon icon={Banknote} label="Manage Budgets" />
            <FeatureIcon icon={WavesIcon} label="Cash Flow Clarity" />
            <FeatureIcon icon={Coins} label="Networth Tracker" />
            <FeatureIcon icon={HelpingHand} label="Connect CFP" />
            <FeatureIcon icon={Star} label="AI powered" />
          </div>

          <p className="relative mt-16 text-auth-accent-foreground text-lg font-medium opacity-90 max-w-2xl">
            See every expense clearly, so your money feels under control. Get started with MoneyFlow today.
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
