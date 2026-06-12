'use client'

import { Loader2 } from 'lucide-react'

interface SubmitButtonProps {
  label: string
  pending?: boolean
}

/** Full-width navy CTA (h52 r14, design spec Core controls). */
export function SubmitButton({ label, pending }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-md leading-body-lg font-semibold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {label}
    </button>
  )
}
