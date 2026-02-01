'use client'

import NetWorthOverview from '@/components/NetWorthOverview'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'
import { OnboardingBanner } from '@/components/onboarding'
import { FinancialGoalsSection } from '@/components/goals'

export default function Home() {
  return (
     <div className="flex flex-col h-full">
      <OnboardingBanner />
      <PageLayout>
        <TopContent>
              <NetWorthOverview />
          </TopContent>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-6">
            <FinancialGoalsSection />
          </div>
        </MainContent>

        <SideContent>
          <div className="space-y-4">
            {/* Side content will go here */}
          </div>
        </SideContent>
        </ContentWrapper>
      </PageLayout>

      </div>
  )
}
