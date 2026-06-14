"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/atoms/button"
import { XIcon } from "lucide-react"

function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(!!defaultOpen)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : internalOpen
  const clearPointerEvents = () => {
    if (typeof document === "undefined") return
    if (document.body.classList.contains("pointer-events-none")) {
      document.body.classList.remove("pointer-events-none")
    }
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = ""
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      clearPointerEvents()
    }
  }

  React.useEffect(() => {
    if (!currentOpen) {
      clearPointerEvents()
    }
  }, [currentOpen])

  React.useEffect(() => {
    return () => {
      clearPointerEvents()
    }
  }, [])

  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      open={currentOpen}
      onOpenChange={handleOpenChange}
      {...props}
    />
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("bg-black/40 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none data-[state=closed]:invisible", className)}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  style: propStyle,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  // Keyboard avoidance for bottom sheets.
  // On Android Chrome, `interactive-widget=resizes-visual` in the viewport meta
  // tag already makes `dvh` shrink with the keyboard. On iOS Safari that meta tag
  // is ignored, so we track the visualViewport manually and lift the sheet above
  // the keyboard via inline style. The same logic is harmless on Android.
  const [keyboardOffset, setKeyboardOffset] = React.useState(0)
  const [visViewportH, setVisViewportH] = React.useState(0)

  React.useEffect(() => {
    if (side !== 'bottom' || typeof window === 'undefined') return
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      setKeyboardOffset(kb)
      setVisViewportH(vv.height)
    }
    vv.addEventListener('resize', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      setKeyboardOffset(0)
    }
  }, [side])

  const keyboardStyle: React.CSSProperties =
    side === 'bottom' && keyboardOffset > 0 && visViewportH > 0
      ? { bottom: keyboardOffset, height: `${visViewportH * 0.95}px`, maxHeight: `${visViewportH * 0.95}px` }
      : {}

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn("bg-background fixed z-50 flex flex-col gap-2 bg-clip-padding text-sm shadow-lg transition-transform duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-[95dvh] data-[side=bottom]:border-t data-[side=bottom]:translate-y-full data-[side=bottom]:data-[state=open]:translate-y-0 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:-translate-x-full data-[side=left]:data-[state=open]:translate-x-0 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:translate-x-full data-[side=right]:data-[state=open]:translate-x-0 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:-translate-y-full data-[side=top]:data-[state=open]:translate-y-0 data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm", className)}
        style={{ ...keyboardStyle, ...propStyle }}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" className="absolute top-3 right-3" size="icon">
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("gap-0.5 p-4 border-b flex flex-col", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto border-t grid grid-cols-2 gap-2 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)]", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
