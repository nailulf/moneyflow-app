import React, { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import ForecastSimulationPage from "@/app/forecast/simulation/page"

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    back: jest.fn(),
  })),
}))

// Mock hooks
jest.mock("@/hooks/useYearlySimulation", () => ({
  useYearlySimulation: jest.fn(),
}))

jest.mock("@/hooks/useForecastQuery", () => ({
  useForecastScenarios: jest.fn(),
}))

// Mock components
jest.mock("@/components/features/accounts/create/CreateFlowHeader", () => ({
  CreateFlowHeader: ({ title, backLabel }: { title: string; backLabel: string }) => (
    <div data-testid="create-flow-header">
      <h1>{title}</h1>
      <button>{backLabel}</button>
    </div>
  ),
}))

jest.mock("@/components/features/forecast/YearlySimulationTable", () => ({
  YearlySimulationTable: ({ rows }: { rows: Array<{ year: number }> }) => (
    <div data-testid="yearly-simulation-table">
      {rows.map((row) => (
        <div key={row.year} data-testid={`year-${row.year}`}>
          {row.year}
        </div>
      ))}
    </div>
  ),
}))

// Mock i18n messages
const mockMessages = {
  forecast: {
    yearByYearTitle: "Year by year",
    medianPath: "{scenario} · median path",
    noSimulation: "No projection yet",
    back: "Back",
  },
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {children}
    </NextIntlClientProvider>
  )
}

describe("ForecastSimulationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders title and subtitle with data", () => {
    const { useYearlySimulation } = require("@/hooks/useYearlySimulation")
    const { useForecastScenarios } = require("@/hooks/useForecastQuery")

    useYearlySimulation.mockReturnValue({
      rows: [{ year: 2025, income: 100000, expense: 50000, netWorth: 500000 }],
      isLoading: false,
    })

    useForecastScenarios.mockReturnValue({
      data: [{ id: "s1", name: "Base Plan", is_default: true }],
    })

    render(<ForecastSimulationPage />, { wrapper: Wrapper })

    expect(screen.getByText("Year by year")).toBeInTheDocument()
    expect(screen.getByText(/Base Plan · median path/)).toBeInTheDocument()
    expect(screen.getByTestId("year-2025")).toBeInTheDocument()
  })

  it("renders empty state when no simulation data", () => {
    const { useYearlySimulation } = require("@/hooks/useYearlySimulation")
    const { useForecastScenarios } = require("@/hooks/useForecastQuery")

    useYearlySimulation.mockReturnValue({
      rows: [],
      isLoading: false,
    })

    useForecastScenarios.mockReturnValue({
      data: [{ id: "s1", name: "Base Plan", is_default: true }],
    })

    render(<ForecastSimulationPage />, { wrapper: Wrapper })

    expect(screen.getByText("No projection yet")).toBeInTheDocument()
  })
})
