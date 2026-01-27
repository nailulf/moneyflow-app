'use client'

import { cn } from '@/lib/utils'
import { LightbulbIcon } from 'lucide-react'

interface EducationalCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  className?: string
}

export function EducationalCard({
  title,
  description,
  icon,
  className
}: EducationalCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          {icon || <LightbulbIcon className="h-4 w-4 text-amber-600" />}
        </div>
        <div>
          <h4 className="font-semibold text-amber-900">{title}</h4>
          <p className="mt-1 text-sm text-amber-800">{description}</p>
        </div>
      </div>
    </div>
  )
}
