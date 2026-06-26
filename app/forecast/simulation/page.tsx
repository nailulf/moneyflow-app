"use client"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CreateFlowHeader } from "@/components/features/accounts/create/CreateFlowHeader"
import { YearlySimulationTable } from "@/components/features/forecast/YearlySimulationTable"
import { useYearlySimulation } from "@/hooks/useYearlySimulation"
import { useForecastScenarios } from "@/hooks/useForecastQuery"

export default function ForecastSimulationPage() {
  const t = useTranslations("forecast")
  const router = useRouter()
  const { rows, isLoading } = useYearlySimulation()
  const { data: scenarios = [] } = useForecastScenarios()
  const scenarioName = (scenarios.find((s) => s.is_default) ?? scenarios[0])?.name ?? ""
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 pt-3 pb-10">
      <CreateFlowHeader title={t("yearByYearTitle")} onBack={() => router.back()} backLabel={t("back")} />
      <p className="px-1 text-sm text-muted-foreground">{t("medianPath", { scenario: scenarioName })}</p>
      {isLoading || rows.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-muted-foreground">{t("noSimulation")}</p>
      ) : (
        <YearlySimulationTable rows={rows} />
      )}
    </div>
  )
}
