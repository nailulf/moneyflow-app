'use client'

import NetWorthOverview from '@/components/NetWorthOverview'
import { PageLayout, MainContent, SideContent, ContentWrapper, TopContent } from '@/components/PageLayout'

export default function Home() {
  return (
     <div className="flex flex-col h-full">
      
      
      
      <PageLayout>
        <TopContent>
              <NetWorthOverview />
          </TopContent>
        <ContentWrapper>
        <MainContent>
          <div className="space-y-4">
            {/* Main content will go here */}
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
