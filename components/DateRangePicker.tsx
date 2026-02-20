'use client'

import React, { useState } from 'react'
import { Calendar, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/atoms/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/molecules/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/molecules/select'
import { Input } from '@/components/ui/atoms/input'
import { Label } from '@/components/ui/atoms/label'

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const PRESET_RANGES = [
  {
    label: 'All Time',
    value: 'all',
    getRange: () => ({ startDate: null, endDate: null })
  },
  {
    label: 'Last 7 days',
    value: '7d',
    getRange: () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }
  },
  {
    label: 'Last 30 days',
    value: '30d',
    getRange: () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }
  },
  {
    label: 'Last 3 months',
    value: '3m',
    getRange: () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }
  },
  {
    label: 'This year',
    value: 'year',
    getRange: () => {
      const now = new Date()
      const startDate = new Date(now.getFullYear(), 0, 1)
      const endDate = new Date(now.getFullYear(), 11, 31)
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }
  },
  {
    label: 'Custom',
    value: 'custom',
    getRange: () => ({ startDate: null, endDate: null })
  }
]

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const formatDateRange = (range: DateRange) => {
    if (!range.startDate && !range.endDate) {
      return 'All Time'
    }
    if (range.startDate && range.endDate) {
      const start = new Date(range.startDate).toLocaleDateString()
      const end = new Date(range.endDate).toLocaleDateString()
      return `${start} - ${end}`
    }
    if (range.startDate) {
      return `From ${new Date(range.startDate).toLocaleDateString()}`
    }
    if (range.endDate) {
      return `Until ${new Date(range.endDate).toLocaleDateString()}`
    }
    return 'Select dates'
  }

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue)
    const preset = PRESET_RANGES.find(p => p.value === presetValue)
    if (preset && presetValue !== 'custom') {
      const range = preset.getRange()
      onChange(range)
      setIsOpen(false)
    }
  }

  const handleCustomDateApply = () => {
    const range: DateRange = {
      startDate: customStartDate || null,
      endDate: customEndDate || null
    }
    onChange(range)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange({ startDate: null, endDate: null })
    setSelectedPreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full h-8 justify-start text-left font-normal text-xs ${className}`}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Time Period</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_RANGES.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPreset === 'custom' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCustomDateApply}
                  className="flex-1"
                  size="sm"
                >
                  Apply
                </Button>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {selectedPreset !== 'custom' && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleClear}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}