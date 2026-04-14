"use client"

import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react"
import { useTranslations } from "next-intl"
import { Copy, HelpCircle, MoreVertical, Plus, Trash2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/molecules/tooltip"
import { Input } from "@/components/ui/atoms/input"
import { Label } from "@/components/ui/atoms/label"
import { Button } from "@/components/ui/atoms/button"
import { Switch } from "@/components/ui/atoms/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/molecules/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/molecules/dropdown-menu"
import { formatCurrency } from "@/lib/data-utils"
import { toPercent, fromPercent } from "@/lib/forecast/types"
import type { ForecastScenario, ScenarioDraft } from "@/lib/forecast/types"

interface ScenarioSettingsProps {
  scenarios: ForecastScenario[]
  selectedScenarioId: string | null
  scenarioDraft: ScenarioDraft | null
  isSaving: boolean
  monthlyCashflow: number
  cashflowMonthsUsed: number
  computedCAGR: number | null
  onSelectScenario: (id: string) => void
  onDraftChange: Dispatch<SetStateAction<ScenarioDraft | null>>
  onSave: () => void
  onCreate: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}): ReactElement {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string
  children: ReactNode
  hint?: string
}): ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="More info"
              className="text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px]">
            {hint}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function PercentInput({
  id,
  value,
  onChange,
  step = 0.1,
}: {
  id: string
  value: number
  onChange: (next: number) => void
  step?: number
}): ReactElement {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pr-8"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  )
}

export function ScenarioSettings({
  scenarios,
  selectedScenarioId,
  scenarioDraft,
  isSaving,
  monthlyCashflow,
  cashflowMonthsUsed,
  computedCAGR,
  onSelectScenario,
  onDraftChange,
  onSave,
  onCreate,
  onDuplicate,
  onDelete,
}: ScenarioSettingsProps): ReactElement {
  const t = useTranslations("forecast.settings")
  const update = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]): void => {
    onDraftChange((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-6 pb-24">
      {/* Scenario picker */}
      <Section title={t("scenarioSection")}>
        <div className="flex items-center gap-2">
          <Select value={selectedScenarioId ?? undefined} onValueChange={onSelectScenario}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("selectScenario")} />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("scenarioActions")}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t("newScenario")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} disabled={!scenarioDraft}>
                <Copy className="mr-2 h-4 w-4" /> {t("duplicate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={scenarios.length <= 1}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Section>

      {/* Basics */}
      <Section title={t("details")}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-name">{t("name")}</FieldLabel>
            <Input
              id="scenario-name"
              value={scenarioDraft?.name ?? ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-description">{t("description")}</FieldLabel>
            <Input
              id="scenario-description"
              value={scenarioDraft?.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* Timeline & goal */}
      <Section title={t("timelineGoal")}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-start">{t("startDate")}</FieldLabel>
            <Input
              id="scenario-start"
              type="date"
              value={scenarioDraft?.start_date ?? ""}
              onChange={(e) => update("start_date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-horizon">{t("horizonYears")}</FieldLabel>
            <Input
              id="scenario-horizon"
              type="number"
              min={1}
              max={60}
              value={scenarioDraft?.horizon_years ?? 10}
              onChange={(e) => update("horizon_years", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-target" hint={t("targetHint")}>
              {t("targetNetWorth")}
            </FieldLabel>
            <Input
              id="scenario-target"
              type="number"
              value={scenarioDraft?.target_net_worth ?? 0}
              onChange={(e) => update("target_net_worth", Number(e.target.value))}
            />
          </div>
        </div>
      </Section>

      {/* Market assumptions */}
      <Section title={t("marketAssumptions")}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-return" hint={t("marketAssumptionsDescription")}>
              {t("annualReturn")}
            </FieldLabel>
            <PercentInput
              id="scenario-return"
              value={scenarioDraft ? toPercent(scenarioDraft.expected_annual_return) : 7}
              onChange={(n) => update("expected_annual_return", fromPercent(n))}
            />
            {computedCAGR !== null && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() =>
                  onDraftChange((prev) =>
                    prev ? { ...prev, expected_annual_return: computedCAGR } : prev,
                  )
                }
              >
                {t("useHistoricalCagr", { value: toPercent(computedCAGR) })}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-volatility">{t("volatility")}</FieldLabel>
            <PercentInput
              id="scenario-volatility"
              value={scenarioDraft ? toPercent(scenarioDraft.annual_volatility) : 12}
              onChange={(n) => update("annual_volatility", fromPercent(n))}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-inflation">{t("inflation")}</FieldLabel>
            <PercentInput
              id="scenario-inflation"
              value={scenarioDraft ? toPercent(scenarioDraft.inflation_rate) : 3}
              onChange={(n) => update("inflation_rate", fromPercent(n))}
            />
          </div>
        </div>
      </Section>

      {/* Cashflow */}
      <Section title={t("cashflow")}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-contribution" hint={t("cashflowGrowthHint")}>
              {t("monthlyIncome")}
            </FieldLabel>
            <Input
              id="scenario-contribution"
              type="number"
              value={scenarioDraft?.monthly_contribution ?? 0}
              onChange={(e) => update("monthly_contribution", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="scenario-withdrawal" hint={t("cashflowGrowthHint")}>
              {t("monthlyExpenses")}
            </FieldLabel>
            <Input
              id="scenario-withdrawal"
              type="number"
              value={scenarioDraft?.monthly_withdrawal ?? 0}
              onChange={(e) => update("monthly_withdrawal", Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <FieldLabel
              htmlFor="scenario-cashflow"
              hint={
                cashflowMonthsUsed > 0
                  ? t("cashflowFromMonths", {
                      months: cashflowMonthsUsed,
                      amount: formatCurrency(monthlyCashflow),
                    })
                  : t("cashflowFallback")
              }
            >
              {t("useActualCashflow")}
            </FieldLabel>
            <Switch
              id="scenario-cashflow"
              checked={scenarioDraft?.include_cashflow ?? false}
              onCheckedChange={(value) => update("include_cashflow", value)}
            />
          </div>
        </div>
      </Section>

      {/* Options */}
      <Section title={t("options")}>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2.5">
          <FieldLabel htmlFor="scenario-default" hint={t("defaultScenarioHint")}>
            {t("defaultScenario")}
          </FieldLabel>
          <Switch
            id="scenario-default"
            checked={scenarioDraft?.is_default ?? false}
            onCheckedChange={(value) => update("is_default", value)}
          />
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving || !scenarioDraft}>
            {isSaving ? t("saving") : t("saveScenario")}
          </Button>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
