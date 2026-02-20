'use client'

import React, { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/molecules/popover'
import { Button } from '@/components/ui/atoms/button'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, setMonth, setYear } from 'date-fns'
import { cn } from '@/lib/utils'

interface PeriodPickerProps {
  date: Date
  onDateChange: (date: Date) => void
  className?: string
  mode?: 'month' | 'year'
}

export function PeriodPicker({ date, onDateChange, className, mode = 'month' }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(date)

  // Sync viewDate with prop date when it changes
  useEffect(() => {
    setViewDate(date)
  }, [date])

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(viewDate, monthIndex)
    // Ensure year is also set from viewDate
    const finalDate = setYear(newDate, viewDate.getFullYear())
    onDateChange(finalDate)
    setOpen(false)
  }

  const handleYearSelect = (year: number) => {
    // Keep current month/day, just change year
    const newDate = setYear(viewDate, year)
    // Update parent state
    onDateChange(newDate)
    // Update local view state to reflect selection immediately
    setViewDate(newDate)
    setOpen(false)
  }

  const handleYearChange = (increment: number) => {
    setViewDate(prev => setYear(prev, prev.getFullYear() + increment))
  }
  
  const handleYearPageChange = (increment: number) => {
    setViewDate(prev => setYear(prev, prev.getFullYear() + (increment * 12)))
  }

  // Generate 12 years centered around viewDate for year picker
  const startYear = viewDate.getFullYear() - 5
  const years = Array.from({ length: 12 }, (_, i) => startYear + i)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            mode === 'month' ? format(date, 'MMMM yyyy') : format(date, 'yyyy')
          ) : (
            <span>Pick a period</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col p-2 space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mode === 'month' ? handleYearChange(-1) : handleYearPageChange(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold">
              {mode === 'month' ? viewDate.getFullYear() : `${years[0]} - ${years[years.length - 1]}`}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mode === 'month' ? handleYearChange(1) : handleYearPageChange(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {mode === 'month' ? (
              months.map((month, index) => (
                <Button
                  key={month}
                  variant={date.getMonth() === index && date.getFullYear() === viewDate.getFullYear() ? "default" : "ghost"}
                  className={cn(
                    "h-9 text-sm",
                    date.getMonth() === index && date.getFullYear() === viewDate.getFullYear() && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </Button>
              ))
            ) : (
              years.map((year) => (
                <Button
                  key={year}
                  variant={date.getFullYear() === year ? "default" : "ghost"}
                  className={cn(
                    "h-9 text-sm",
                    date.getFullYear() === year && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </Button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
