'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AssumptionsForm } from '@/components/features/forecast/AssumptionsForm'
import { CreateFlowHeader } from '@/components/features/accounts/create/CreateFlowHeader'
import { StickyCtaBar } from '@/components/features/budget/StickyCtaBar'
import { Button } from '@/components/ui/atoms/button'
import {
  useForecastScenarios,
  useForecastCashflow,
  useSaveScenario,
  useDeleteScenario,
  useCreateScenario,
} from '@/hooks/useForecastQuery'
import { buildDraft, type ScenarioDraft } from '@/lib/forecast/types'

export default function AssumptionsPage() {
  const t = useTranslations('forecast.assumptions')
  const router = useRouter()
  const scenarioId = useSearchParams().get('scenario')

  const { data: scenarios = [] } = useForecastScenarios()
  const { data: cashflowData } = useForecastCashflow()

  const scenario = scenarios.find((s) => s.id === scenarioId)
  const [draft, setDraft] = useState<ScenarioDraft | null>(null)

  useEffect(() => {
    if (scenario) setDraft(buildDraft(scenario))
  }, [scenario])

  useEffect(() => {
    if (scenarios.length > 0 && !scenario) router.replace('/forecast')
  }, [scenarios, scenario, router])

  const save = useSaveScenario()
  const del = useDeleteScenario()
  const create = useCreateScenario()

  const monthlyCashflow =
    ((cashflowData?.annualIncome ?? 0) - (cashflowData?.annualExpenses ?? 0)) / 12
  const cashflowMonthsUsed = cashflowData?.monthsUsed ?? 0

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!scenarioId || !draft) return
    await save.mutateAsync({ scenarioId, draft })
    router.back()
  }

  const handleDelete = async () => {
    if (!scenarioId) return
    await del.mutateAsync(scenarioId)
    router.back()
  }

  const handleDuplicate = async () => {
    if (!draft) return
    const c = await create.mutateAsync({
      ...draft,
      name: `${draft.name} (Copy)`,
      is_default: false,
    })
    router.replace(`/forecast/assumptions?scenario=${c.id}`)
  }

  return (
    <form
      id="assumptions-form"
      onSubmit={handleSave}
      className="mx-auto flex w-full max-w-md flex-col gap-4 pt-3 pb-28"
    >
      <CreateFlowHeader
        title={t('title')}
        onBack={() => router.back()}
        backLabel={t('back')}
        formId="assumptions-form"
        saveLabel={t('save')}
        pending={save.isPending}
      />
      {draft && (
        <>
          <AssumptionsForm
            draft={draft}
            onChange={setDraft}
            monthlyCashflow={monthlyCashflow}
            cashflowMonthsUsed={cashflowMonthsUsed}
          />
          <div className="flex flex-col gap-2 px-1">
            <button
              type="button"
              onClick={handleDuplicate}
              className="text-sm font-medium text-primary"
            >
              {t('duplicateScenario')}
            </button>
            {scenarios.length > 1 && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm font-medium text-destructive"
              >
                {t('deleteScenario')}
              </button>
            )}
          </div>
        </>
      )}
      <StickyCtaBar>
        <Button
          type="submit"
          form="assumptions-form"
          disabled={save.isPending || !draft}
          className="w-full"
        >
          {t('saveCta')}
        </Button>
      </StickyCtaBar>
    </form>
  )
}
