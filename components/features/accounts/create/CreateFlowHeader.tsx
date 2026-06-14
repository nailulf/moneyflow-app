'use client'

import { ArrowLeft } from 'lucide-react'

interface CreateFlowHeaderProps {
  title: string
  onBack: () => void
  backLabel: string
  formId?: string
  saveLabel?: string
  pending?: boolean
  stepLabel?: string
}

/** Flow header (design `CuDYL` top row): back circle, centered title, optional Save pill. */
export function CreateFlowHeader({ title, onBack, backLabel, formId, saveLabel, pending, stepLabel }: CreateFlowHeaderProps) {
  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
      >
        <ArrowLeft className="h-4 w-4 text-foreground" aria-hidden="true" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-lg leading-body-lg font-bold text-foreground">{title}</h1>
      {formId && saveLabel ? (
        <>
          {stepLabel && (
            <span className="shrink-0 text-xs leading-caption font-semibold text-muted-foreground">{stepLabel}</span>
          )}
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm leading-none font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </>
      ) : stepLabel ? (
        <span className="shrink-0 text-xs leading-caption font-semibold text-muted-foreground">{stepLabel}</span>
      ) : (
        <span className="h-9 w-9 shrink-0" aria-hidden="true" />
      )}
    </header>
  )
}
