import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NextIntlClientProvider } from 'next-intl'
import { ForecastScenarioSheet } from '@/components/features/forecast/ForecastScenarioSheet'
import type { ComparisonRow } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(<NextIntlClientProvider locale="en" messages={en}>{ui}</NextIntlClientProvider>)

const rows: ComparisonRow[] = [
  { id: 'aggressive', name: 'Aggressive', isDefault: true, endValue: 5_000_000_000, successRate: 90 },
  { id: 'conservative', name: 'Conservative', isDefault: false, endValue: 2_000_000_000, successRate: 30 },
]

describe('ForecastScenarioSheet', () => {
  it('renders rows with success-colored badges and wires New/Compare/onSelect', () => {
    const onSelect = jest.fn()
    const onOpenChange = jest.fn()
    const onNew = jest.fn()
    const onCompare = jest.fn()

    wrap(
      <ForecastScenarioSheet
        open
        onOpenChange={onOpenChange}
        rows={rows}
        selectedScenarioId="aggressive"
        onSelect={onSelect}
        onNew={onNew}
        onCompare={onCompare}
      />
    )

    // Both names render
    expect(screen.getByText('Aggressive')).toBeInTheDocument()
    expect(screen.getByText('Conservative')).toBeInTheDocument()

    // 90 row badge is success-colored, 30 row badge is destructive-colored
    const goodBadge = screen.getByText('90%')
    expect(goodBadge.className).toContain('text-success')
    const badBadge = screen.getByText('30%')
    expect(badBadge.className).toContain('text-destructive')

    // "New" header action
    fireEvent.click(screen.getByText('New'))
    expect(onNew).toHaveBeenCalled()

    // "Compare scenarios" footer action
    fireEvent.click(screen.getByText('Compare scenarios'))
    expect(onCompare).toHaveBeenCalled()

    // Tapping the 2nd row selects it
    fireEvent.click(screen.getByText('Conservative'))
    expect(onSelect).toHaveBeenCalledWith('conservative')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
