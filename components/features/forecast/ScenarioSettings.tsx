"use client"

import type { Dispatch, ReactElement, SetStateAction } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/molecules/card"
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
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Scenario Settings</CardTitle>
        <CardDescription>Adjust assumptions and save to update the forecast.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="scenario-select">Scenario</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedScenarioId ?? undefined}
                onValueChange={onSelectScenario}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={onCreate}>New</Button>
              <Button size="sm" variant="outline" onClick={onDuplicate} disabled={!scenarioDraft}>Duplicate</Button>
              <Button size="sm" variant="destructive" onClick={onDelete} disabled={scenarios.length <= 1}>Delete</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-name">Name</Label>
            <Input
              id="scenario-name"
              value={scenarioDraft?.name ?? ""}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, name: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-description">Description</Label>
            <Input
              id="scenario-description"
              value={scenarioDraft?.description ?? ""}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, description: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-start">Start Date</Label>
            <Input
              id="scenario-start"
              type="date"
              value={scenarioDraft?.start_date ?? ""}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, start_date: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-horizon">Horizon Years</Label>
            <Input
              id="scenario-horizon"
              type="number"
              min={1}
              max={60}
              value={scenarioDraft?.horizon_years ?? 10}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, horizon_years: Number(e.target.value) } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-target">Target Net Worth</Label>
            <Input
              id="scenario-target"
              type="number"
              value={scenarioDraft?.target_net_worth ?? 0}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, target_net_worth: Number(e.target.value) } : prev)}
            />
            <p className="text-xs text-muted-foreground">
              Success rate measures paths ending above this value. Default 0.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-return">Expected Annual Return (%)</Label>
            <Input
              id="scenario-return"
              type="number"
              step="0.1"
              value={scenarioDraft ? toPercent(scenarioDraft.expected_annual_return) : 7}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, expected_annual_return: fromPercent(Number(e.target.value)) } : prev)}
            />
            {computedCAGR !== null && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => onDraftChange((prev) => prev ? { ...prev, expected_annual_return: computedCAGR } : prev)}
              >
                Use historical CAGR: {toPercent(computedCAGR)}%
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-volatility">Annual Volatility (%)</Label>
            <Input
              id="scenario-volatility"
              type="number"
              step="0.1"
              value={scenarioDraft ? toPercent(scenarioDraft.annual_volatility) : 12}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, annual_volatility: fromPercent(Number(e.target.value)) } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-inflation">Inflation Rate (%)</Label>
            <Input
              id="scenario-inflation"
              type="number"
              step="0.1"
              value={scenarioDraft ? toPercent(scenarioDraft.inflation_rate) : 3}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, inflation_rate: fromPercent(Number(e.target.value)) } : prev)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-contribution">Monthly Contribution</Label>
            <Input
              id="scenario-contribution"
              type="number"
              value={scenarioDraft?.monthly_contribution ?? 0}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, monthly_contribution: Number(e.target.value) } : prev)}
            />
            <p className="text-xs text-muted-foreground">
              Extra contribution on top of cashflow. Default 0 — cashflow already included below.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario-withdrawal">Monthly Withdrawal</Label>
            <Input
              id="scenario-withdrawal"
              type="number"
              value={scenarioDraft?.monthly_withdrawal ?? 0}
              onChange={(e) => onDraftChange((prev) => prev ? { ...prev, monthly_withdrawal: Number(e.target.value) } : prev)}
            />
            <p className="text-xs text-muted-foreground">
              Extra withdrawal on top of cashflow. Default 0.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <Label htmlFor="scenario-cashflow">Include Cashflow</Label>
              <p className="text-xs text-muted-foreground">
                {cashflowMonthsUsed > 0
                  ? `Median net cashflow from ${cashflowMonthsUsed} months: ${formatCurrency(monthlyCashflow)}/mo`
                  : "Uses median monthly net cashflow from recent transactions."}
              </p>
            </div>
            <Switch
              id="scenario-cashflow"
              checked={scenarioDraft?.include_cashflow ?? false}
              onCheckedChange={(value) => onDraftChange((prev) => prev ? { ...prev, include_cashflow: value } : prev)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <Label htmlFor="scenario-default">Default Scenario</Label>
              <p className="text-xs text-muted-foreground">
                Make this the scenario used by default.
              </p>
            </div>
            <Switch
              id="scenario-default"
              checked={scenarioDraft?.is_default ?? false}
              onCheckedChange={(value) => onDraftChange((prev) => prev ? { ...prev, is_default: value } : prev)}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={onSave} disabled={isSaving || !scenarioDraft}>
            {isSaving ? "Saving..." : "Save Scenario"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
