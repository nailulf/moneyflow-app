import * as React from "react"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { CurrencyInput } from "@/components/ui/atoms/currency-input"

const baseInputClassName =
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 lg:h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-md leading-body-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"

const baseInputFocusClassName =
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

const baseInputInvalidClassName =
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

type InputType = React.ComponentProps<"input">["type"] | "amount"

type InputProps = Omit<React.ComponentProps<"input">, "type"> & {
  type?: InputType
}

const DatePickerInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        ref={ref}
        type="date"
        data-slot="input"
        className={cn(
          baseInputClassName,
          baseInputFocusClassName,
          baseInputInvalidClassName,
          "pl-10",
          className
        )}
      />
    </div>
  )
)

DatePickerInput.displayName = "DatePickerInput"

type AmountInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "defaultValue"> & {
  value?: number | string | readonly string[]
  defaultValue?: number | string | readonly string[]
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  name?: string
  className?: string
}

const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, defaultValue, onChange, name, className, ...props }, ref) => {
    // visibleInputRef points to the actual <input> inside CurrencyInput.
    // The forwarded `ref` is overridden below via useImperativeHandle to expose
    // the raw numeric value, preventing react-hook-form from reading the
    // id-ID-formatted display string (e.g. "90.000") and parsing it as 90.
    const visibleInputRef = React.useRef<HTMLInputElement>(null)

    const getInitial = () => {
      if (value !== undefined) return Number(value) || 0
      if (defaultValue !== undefined) return Number(defaultValue) || 0
      return 0
    }

    const [internalValue, setInternalValue] = React.useState<number>(getInitial)
    // rawValueRef holds the source-of-truth numeric value synchronously so the
    // Proxy getter always returns the latest value without waiting for a render.
    const rawValueRef = React.useRef<number>(getInitial())

    React.useEffect(() => {
      if (value !== undefined) {
        const n = Number(value) || 0
        setInternalValue(n)
        rawValueRef.current = n
      }
    }, [value])

    // Override the forwarded ref so react-hook-form always reads/writes the raw
    // numeric string instead of the formatted display value.
    React.useImperativeHandle(ref, () => {
      const el = visibleInputRef.current!
      return new Proxy(el, {
        get(target, prop) {
          if (prop === 'value') return String(rawValueRef.current)
          if (prop === 'valueAsNumber') return rawValueRef.current
          const val = Reflect.get(target, prop, target)
          return typeof val === 'function' ? val.bind(target) : val
        },
        set(target, prop, val) {
          if (prop === 'value') {
            // react-hook-form sets ref.current.value during reset()
            const n = Number(val) || 0
            rawValueRef.current = n
            setInternalValue(n)
            return true
          }
          return Reflect.set(target, prop, val)
        },
      }) as unknown as HTMLInputElement
    }, [])

    const handleCurrencyChange = (nextValue: number) => {
      rawValueRef.current = nextValue
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      if (onChange) {
        const event = {
          target: { value: String(nextValue), name },
          currentTarget: { value: String(nextValue), name },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(event)
      }
    }

    return (
      <CurrencyInput
        {...props}
        ref={visibleInputRef}
        value={value !== undefined ? Number(value) || 0 : internalValue}
        onChange={handleCurrencyChange}
        name={name}
        className={className}
        data-slot="input"
      />
    )
  }
)

AmountInput.displayName = "AmountInput"

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, value, defaultValue, name, ...props }, ref) => {
    if (type === "amount") {
      return (
        <AmountInput
          {...props}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          name={name}
          className={className}
        />
      )
    }

    if (type === "date") {
      return (
        <DatePickerInput
          {...props}
          ref={ref}
          name={name}
          value={value as string | number | readonly string[] | undefined}
          defaultValue={defaultValue}
          onChange={onChange}
          className={className}
        />
      )
    }

    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          baseInputClassName,
          baseInputFocusClassName,
          baseInputInvalidClassName,
          className
        )}
        onChange={onChange}
        value={value}
        defaultValue={defaultValue}
        name={name}
        {...props}
        ref={ref}
      />
    )
  }
)

Input.displayName = "Input"

export { Input, DatePickerInput }
