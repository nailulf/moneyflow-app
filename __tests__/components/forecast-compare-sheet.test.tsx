import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ScenarioCompareSheet } from '@/components/features/forecast/ScenarioCompareSheet'
import type { ComparisonRow } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

describe('ScenarioCompareSheet', () => {
  it('renders comparison sheet with scenario data', () => {
    const rows: ComparisonRow[] = [
      {
        id: '1',
        name: 'Conservative',
        endValue: 500_000_000,
        successRate: 85,
        isDefault: true,
      },
      {
        id: '2',
        name: 'Moderate',
        endValue: 750_000_000,
        successRate: 65,
        isDefault: false,
      },
    ]

    wrap(
      <ScenarioCompareSheet
        open={true}
        onOpenChange={() => {}}
        rows={rows}
        selectedScenarioId="1"
      />
    )

    // Verify scenario names render
    expect(screen.getByText('Conservative')).toBeInTheDocument()
    expect(screen.getByText('Moderate')).toBeInTheDocument()

    // Verify at least one of the strings ScenarioComparison produces appears
    // (looking for success rate string)
    expect(screen.getByText(/85%\s+success/)).toBeInTheDocument()
    expect(screen.getByText(/65%\s+success/)).toBeInTheDocument()
  })
})
