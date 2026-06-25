import { ReactElement, ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { EventCategoryGrid } from "@/components/features/forecast/EventCategoryGrid"

const messages = {
  "forecast": {
    "categories": {
      "PROPERTY": {
        "template": "Buy a home",
        "subLabel": "Property"
      },
      "WEDDING": {
        "template": "Plan a wedding",
        "subLabel": "One-time cost"
      },
      "KIDS": {
        "template": "Have a kid",
        "subLabel": "Recurring"
      },
      "EDUCATION": {
        "template": "College savings",
        "subLabel": "Tuition"
      },
      "HAJJ": {
        "template": "Hajj pilgrimage",
        "subLabel": "One-time cost"
      },
      "VEHICLE": {
        "template": "Buy a vehicle",
        "subLabel": "Property"
      },
      "RETIREMENT": {
        "template": "Plan retirement",
        "subLabel": "Income stops"
      },
      "OTHER": {
        "template": "Custom event",
        "subLabel": "Other"
      }
    }
  }
}

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

describe("EventCategoryGrid", () => {
  it("renders all 8 category tiles with template labels", () => {
    const onSelect = jest.fn()
    render(<EventCategoryGrid onSelect={onSelect} />, { wrapper: Wrapper })

    expect(screen.getByText("Buy a home")).toBeInTheDocument()
    expect(screen.getByText("Plan a wedding")).toBeInTheDocument()
    expect(screen.getByText("Have a kid")).toBeInTheDocument()
    expect(screen.getByText("College savings")).toBeInTheDocument()
    expect(screen.getByText("Hajj pilgrimage")).toBeInTheDocument()
    expect(screen.getByText("Buy a vehicle")).toBeInTheDocument()
    expect(screen.getByText("Plan retirement")).toBeInTheDocument()
    expect(screen.getByText("Custom event")).toBeInTheDocument()
  })

  it("calls onSelect with PROPERTY when the buy a home tile is clicked", async () => {
    const onSelect = jest.fn()
    const user = userEvent.setup()
    render(<EventCategoryGrid onSelect={onSelect} />, { wrapper: Wrapper })

    const propertyTile = screen.getByRole("button", { name: /buy a home/i })
    await user.click(propertyTile)

    expect(onSelect).toHaveBeenCalledWith("PROPERTY")
  })

  it("renders subLabels for all categories", () => {
    const onSelect = jest.fn()
    render(<EventCategoryGrid onSelect={onSelect} />, { wrapper: Wrapper })

    expect(screen.getAllByText("Property")).toHaveLength(2) // PROPERTY and VEHICLE
    expect(screen.getAllByText("One-time cost")).toHaveLength(2) // WEDDING and HAJJ
    expect(screen.getByText("Recurring")).toBeInTheDocument()
    expect(screen.getByText("Tuition")).toBeInTheDocument()
    expect(screen.getByText("Income stops")).toBeInTheDocument()
    expect(screen.getByText("Other")).toBeInTheDocument()
  })
})
