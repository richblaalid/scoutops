'use client'

import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

/**
 * ResponsiveTable - A wrapper that provides consistent responsive table styling
 *
 * Features:
 * - Horizontal scroll with fade indicators on overflow
 * - Consistent container styling
 * - Accessible scrolling region
 *
 * Usage:
 * <ResponsiveTable>
 *   <table className="w-full">
 *     ...
 *   </table>
 * </ResponsiveTable>
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        "relative overflow-x-auto rounded-lg",
        // Subtle gradient indicators for horizontal scroll (when content overflows)
        "before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:z-10 before:w-4",
        "before:bg-gradient-to-r before:from-white before:to-transparent dark:before:from-stone-900",
        "before:opacity-0 before:[&:hover]:opacity-100 before:transition-opacity",
        "after:pointer-events-none after:absolute after:right-0 after:top-0 after:bottom-0 after:z-10 after:w-4",
        "after:bg-gradient-to-l after:from-white after:to-transparent dark:after:from-stone-900",
        "after:opacity-0 after:[&:hover]:opacity-100 after:transition-opacity",
        className
      )}
      role="region"
      aria-label="Scrollable table"
      tabIndex={0}
    >
      {children}
    </div>
  )
}

/**
 * Table component styles for consistent appearance
 *
 * These are utility classes to apply to table elements for consistency
 */
export const tableStyles = {
  table: "w-full",
  thead: "text-left text-sm text-stone-500",
  th: "pb-3 pr-4 font-medium",
  thSortable: "pb-3 pr-4 font-medium cursor-pointer select-none hover:text-stone-700 transition-colors",
  tbody: "",
  tr: "border-b last:border-0",
  td: "py-3 pr-4",
  tdActions: "py-3 pl-4 sm:pl-6 whitespace-nowrap",
  // Responsive visibility helpers
  hiddenSm: "hidden sm:table-cell",
  hiddenMd: "hidden md:table-cell",
  hiddenLg: "hidden lg:table-cell",
  hiddenXl: "hidden xl:table-cell",
  // Text alignment
  textRight: "text-right",
  // No wrap
  nowrap: "whitespace-nowrap",
}

/**
 * Mobile-friendly table row sub-info
 * Use this to show additional context under the primary cell on mobile
 */
export function MobileSubInfo({
  children,
  hideAbove = 'sm'
}: {
  children: React.ReactNode
  hideAbove?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const hideClass = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
    xl: 'xl:hidden',
  }[hideAbove]

  return (
    <p className={cn("text-xs text-stone-500 mt-0.5", hideClass)}>
      {children}
    </p>
  )
}
