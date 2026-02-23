'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/atoms/button'
import { Badge } from '@/components/ui/atoms/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/molecules/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/organisms/sheet'
import { Calendar, Filter, Plus, Target } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface BudgetFilterBarProps {
  timeRange: 'monthly' | 'yearly'
  onTimeRangeChange: (value: 'monthly' | 'yearly') => void
  selectedYear: number
  onYearChange: (year: number) => void
  selectedMonth: number
  onMonthChange: (month: number) => void
  selectedBudgetName?: string
  onCreateBudget?: () => void
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

function FilterControls({
  timeRange,
  onTimeRangeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  stacked = false,
}: Omit<BudgetFilterBarProps, 'selectedBudgetName' | 'onCreateBudget'> & { stacked?: boolean }) {
  return (
    <div className={stacked ? 'space-y-4' : 'flex items-center gap-2'}>
      {stacked && (
        <label className="text-sm font-medium text-foreground">Period</label>
      )}
      <Select value={timeRange} onValueChange={(value: 'monthly' | 'yearly') => onTimeRangeChange(value)}>
        <SelectTrigger className={stacked ? 'w-full' : 'w-32'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>

      {stacked && (
        <label className="text-sm font-medium text-foreground">Year</label>
      )}
      <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
        <SelectTrigger className={stacked ? 'w-full' : 'w-20'}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map(year => (
            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {timeRange === 'monthly' && (
        <>
          {stacked && (
            <label className="text-sm font-medium text-foreground">Month</label>
          )}
          <Select value={selectedMonth.toString()} onValueChange={(value) => onMonthChange(parseInt(value))}>
            <SelectTrigger className={stacked ? 'w-full' : 'w-24'}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <SelectItem key={month} value={month.toString()}>
                  {new Date(0, month - 1).toLocaleString('default', { month: stacked ? 'long' : 'short' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  )
}

export function BudgetFilterBar({
  timeRange,
  onTimeRangeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  selectedBudgetName,
  onCreateBudget,
}: BudgetFilterBarProps) {
  const isMobile = useIsMobile()
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const actionButton = onCreateBudget ? (
    <Button onClick={onCreateBudget} size={isMobile ? 'sm' : 'default'} className="shrink-0">
      <Plus className="h-4 w-4 mr-1" />
      {isMobile ? 'Budget' : 'Create Budget'}
    </Button>
  ) : null

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFilterOpen(true)}
          className="shrink-0"
        >
          <Filter className="h-4 w-4" />
        </Button>

        {actionButton}

        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="bottom" className="h-auto rounded-t-xl pb- w-full">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filter Period
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterControls
                timeRange={timeRange}
                onTimeRangeChange={onTimeRangeChange}
                selectedYear={selectedYear}
                onYearChange={onYearChange}
                selectedMonth={selectedMonth}
                onMonthChange={onMonthChange}
                stacked
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2" >
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <FilterControls
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        selectedYear={selectedYear}
        onYearChange={onYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
      />

      {selectedBudgetName && (
        <Badge variant="outline" className="flex items-center gap-2">
          <Target className="h-3 w-3" />
          {selectedBudgetName}
        </Badge>
      )}

      {actionButton}
    </div>
  )
}
