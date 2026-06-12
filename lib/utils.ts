import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge only knows Tailwind's default scales. Without this config it
// classifies our custom utilities by prefix heuristics — `text-tiny`/`text-nano`
// read as text COLORS and get deleted whenever a real text color appears in the
// same cn() call. Register every custom group we mint in tailwind.config.js.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["tiny", "nano"] }],
      "bg-image": [{ bg: ["hero-gradient"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
