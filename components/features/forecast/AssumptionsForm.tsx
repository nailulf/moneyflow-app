"use client"

import { useTranslations } from "next-intl"
import { CurrencyInput } from "@/components/ui/atoms/currency-input"
import { Switch } from "@/components/ui/atoms/switch"
import { formatCurrencyCompact } from "@/lib/data-utils"
import { type ScenarioDraft, toPercent, fromPercent } from "@/lib/forecast/types"
import { cn } from "@/lib/utils"

type AssumptionsFormProps = {
  draft: ScenarioDraft
  onChange: (next: ScenarioDraft) => void
  monthlyCashflow: number
  cashflowMonthsUsed: number
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title ? (
        <h3 className="px-1 text-tiny font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className="divide-y divide-muted rounded-2xl bg-card shadow-card">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-sm text-foreground">{label}</div>
      <div className="flex items-center justify-end text-sm text-foreground">{children}</div>
    </div>
  )
}

export function AssumptionsForm({
  draft,
  onChange,
  monthlyCashflow,
  cashflowMonthsUsed,
}: AssumptionsFormProps) {
  const t = useTranslations("forecast.assumptions")

  const update = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) => {
    onChange({ ...draft, [key]: value })
  }

  const percentField = (
    key: "expected_annual_return" | "annual_volatility" | "inflation_rate" | "annual_income_growth",
    testId: string
  ) => (
    <>
      <input
        type="number"
        inputMode="decimal"
        data-testid={testId}
        className="w-16 bg-transparent text-right outline-none"
        value={toPercent(draft[key])}
        onChange={(e) => update(key, fromPercent(Number(e.target.value) || 0))}
      />
      <span className="ml-1 text-muted-foreground">{t("pctUnit")}</span>
    </>
  )

  return (
    <div className="space-y-5">
      {/* Scenario identity */}
      <Section>
        <Row label={t("name")}>
          <input
            type="text"
            className="bg-transparent text-right outline-none"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Row>
        <Row label={t("description")}>
          <input
            type="text"
            className="bg-transparent text-right outline-none"
            value={draft.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
          />
        </Row>
      </Section>

      {/* Growth */}
      <Section title={t("growth")}>
        <Row label={t("expectedReturn")}>
          {percentField("expected_annual_return", "assumptions-expected-return")}
        </Row>
        <Row label={t("volatility")}>
          {percentField("annual_volatility", "assumptions-volatility")}
        </Row>
      </Section>

      {/* Inflation & income */}
      <Section title={t("inflationIncome")}>
        <Row label={t("inflation")}>
          {percentField("inflation_rate", "assumptions-inflation")}
        </Row>
        <Row
          label={
            <span className="flex items-center gap-2">
              {t("incomeGrowth")}
              <span
                className={cn(
                  "rounded-full bg-selected px-1.5 text-nano font-semibold text-selected-foreground"
                )}
              >
                {t("incomeNew")}
              </span>
            </span>
          }
        >
          {percentField("annual_income_growth", "assumptions-income-growth")}
        </Row>
      </Section>

      {/* Contributions */}
      <Section title={t("contributions")}>
        <Row label={t("monthlyContribution")}>
          <CurrencyInput
            value={draft.monthly_contribution}
            onChange={(v) => update("monthly_contribution", v)}
            className="text-right"
          />
        </Row>
        <Row label={t("monthlyWithdrawal")}>
          <CurrencyInput
            value={draft.monthly_withdrawal}
            onChange={(v) => update("monthly_withdrawal", v)}
            className="text-right"
          />
        </Row>
      </Section>

      {/* Horizon & goal */}
      <Section title={t("horizonGoal")}>
        <Row label={t("horizon")}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            className="w-16 bg-transparent text-right outline-none"
            value={draft.horizon_years}
            onChange={(e) => update("horizon_years", Number(e.target.value) || 0)}
          />
          <span className="ml-1 text-muted-foreground">{t("yearsUnit")}</span>
        </Row>
        <Row label={t("targetNetWorth")}>
          <CurrencyInput
            value={draft.target_net_worth}
            onChange={(v) => update("target_net_worth", v)}
            className="text-right"
            data-testid="assumptions-target-net-worth"
          />
        </Row>
      </Section>

      {/* Source */}
      <Section title={t("source")}>
        <Row label={t("useHistory")}>
          <Switch
            checked={draft.include_cashflow}
            onCheckedChange={(v) => update("include_cashflow", v)}
          />
        </Row>
        <p className="px-4 pb-3 text-tiny text-muted-foreground">
          {t("sourceHelper", {
            amount: formatCurrencyCompact(monthlyCashflow),
            months: cashflowMonthsUsed,
          })}
        </p>
      </Section>
    </div>
  )
}
