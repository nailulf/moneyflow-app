"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      {/* Pin the toaster to the top-most layer so a toast (errors/warnings
          included) can never be covered by the bottom nav, sheets, or dialogs
          (all z-50). Sonner's container defaults to z-index 999999999; force the
          max to keep it on the highest layer regardless of stacking context. */}
      <style>{`
        [data-sonner-toaster] { z-index: 2147483647 !important; }
      `}</style>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        position="bottom-center"
        // Desktop: rest just above the bottom edge. Mobile: clear the fixed
        // bottom navigation (h-14 bar + 0.75rem padding + safe-area) so the
        // toast always sits above it.
        offset={{ bottom: "1.5rem" }}
        mobileOffset={{
          bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
          left: "1rem",
          right: "1rem",
        }}
        style={
          {
            // Wrap in hsl(): the tokens are raw HSL triplets (e.g. "0 0% 100%"),
            // not full colors. Passing the bare var made --normal-bg an invalid
            // color, so the toast rendered transparent. hsl(var(--popover)) yields
            // a solid (opaque) surface.
            "--normal-bg": "hsl(var(--popover))",
            "--normal-text": "hsl(var(--popover-foreground))",
            "--normal-border": "hsl(var(--border))",
          } as React.CSSProperties
        }
        {...props}
      />
    </>
  )
}

export { Toaster }
