import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Other'
] as const

export type Category = typeof categories[number]

export const categoryColors: Record<Category, string> = {
  Food: 'bg-red-100 text-red-800',
  Transport: 'bg-blue-100 text-blue-800',
  Shopping: 'bg-purple-100 text-purple-800',
  Bills: 'bg-yellow-100 text-yellow-800',
  Entertainment: 'bg-green-100 text-green-800',
  Other: 'bg-gray-100 text-gray-800'
}