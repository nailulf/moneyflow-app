import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ScenarioSettings } from '@/components/features/forecast/ScenarioSettings'
import { defaultScenarioPayload, type ScenarioDraft } from '@/lib/forecast/types'
import en from '@/messages/en.json'

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  )

function renderSettings(overrides: Partial<ScenarioDraft> = {}) {
  const onDraftChange = jest.fn()
  const draft: ScenarioDraft = { ...defaultScenarioPayload, ...overrides }
  const utils = wrap(
    <ScenarioSettings
      scenarios={[]}
      selectedScenarioId={null}
      scenarioDraft={draft}
      isSaving={false}
      monthlyCashflow={0}
      cashflowMonthsUsed={0}
      computedCAGR={null}
      onSelectScenario={jest.fn()}
      onDraftChange={onDraftChange}
      onSave={jest.fn()}
      onCreate={jest.fn()}
      onDuplicate={jest.fn()}
      onDelete={jest.fn()}
    />,
  )
  return { ...utils, onDraftChange, draft }
}

describe('ScenarioSettings income-growth field', () => {
  it('shows annual_income_growth as a percent', () => {
    const { container } = renderSettings({ annual_income_growth: 0.05 })
    const input = container.querySelector<HTMLInputElement>('#scenario-income-growth')
    expect(input).not.toBeNull()
    expect(input!.value).toBe('5')
  })

  it('renders the income-growth label', () => {
    renderSettings()
    expect(screen.getByText(en.forecast.settings.incomeGrowth)).toBeInTheDocument()
  })

  it('writes the fraction value on change', () => {
    const { container, onDraftChange, draft } = renderSettings({ annual_income_growth: 0.05 })
    const input = container.querySelector<HTMLInputElement>('#scenario-income-growth')!
    fireEvent.change(input, { target: { value: '8' } })

    expect(onDraftChange).toHaveBeenCalledTimes(1)
    const updater = onDraftChange.mock.calls[0][0] as (prev: ScenarioDraft) => ScenarioDraft
    expect(updater(draft).annual_income_growth).toBeCloseTo(0.08)
  })
})
