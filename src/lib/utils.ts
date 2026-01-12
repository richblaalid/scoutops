import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

export function formatDate(date: string | Date): string {
  let d: Date
  if (typeof date === 'string') {
    // For date-only strings (e.g., "2024-01-15"), append noon time
    // to avoid UTC interpretation shifting the date
    if (!date.includes('T')) {
      d = new Date(date + 'T12:00:00')
    } else {
      d = new Date(date)
    }
  } else {
    d = date
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return formatter.format(d)
}
