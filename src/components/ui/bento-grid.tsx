import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * BentoGrid - A responsive grid layout with variable-sized cards
 * Creates visual hierarchy by allowing cards of different sizes
 */
export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * BentoCard - A card that can span multiple rows/columns
 * Use colSpan and rowSpan to control size
 */
export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2 | 3
  variant?: 'default' | 'accent' | 'highlight' | 'muted'
}

export function BentoCard({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  variant = 'default',
  ...props
}: BentoCardProps) {
  const colSpanClasses = {
    1: '',
    2: 'sm:col-span-2',
    3: 'sm:col-span-2 lg:col-span-3',
    4: 'sm:col-span-2 xl:col-span-4',
  }

  const rowSpanClasses = {
    1: '',
    2: 'row-span-2',
    3: 'row-span-3',
  }

  const variantClasses = {
    default:
      'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800',
    accent:
      'border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-stone-800 dark:border-amber-800',
    highlight:
      'border-forest-200 bg-gradient-to-br from-forest-50 to-white dark:from-forest-900/20 dark:to-stone-800 dark:border-forest-800',
    muted:
      'border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900',
  }

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 motion-reduce:transform-none',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * BentoCardHeader - Header section for bento cards
 */
export function BentoCardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between', className)}>
      {children}
    </div>
  )
}

/**
 * BentoCardTitle - Title for bento cards
 */
export function BentoCardTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3
      className={cn(
        'font-display text-lg font-semibold text-forest-800 dark:text-forest-200',
        className
      )}
    >
      {children}
    </h3>
  )
}

/**
 * BentoCardDescription - Description text for bento cards
 */
export function BentoCardDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn('text-sm text-stone-500 dark:text-stone-400', className)}>
      {children}
    </p>
  )
}

/**
 * BentoCardContent - Main content area for bento cards
 */
export function BentoCardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('flex-1', className)}>{children}</div>
}

/**
 * BentoCardFooter - Footer section for bento cards
 */
export function BentoCardFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

/**
 * BentoCardIcon - Icon container with background
 */
export function BentoCardIcon({
  children,
  className,
  variant = 'default',
}: {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'success' | 'warning'
}) {
  const variantClasses = {
    default: 'bg-forest-100 text-forest-700 dark:bg-forest-900/50 dark:text-forest-300',
    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    success: 'bg-success-light text-success-dark dark:bg-success/20 dark:text-success',
    warning: 'bg-warning-light text-warning-dark dark:bg-warning/20 dark:text-warning',
  }

  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * BentoStatCard - Pre-built card for displaying statistics
 */
export function BentoStatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className,
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  className?: string
}) {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-stone-500',
  }

  return (
    <BentoCard className={className}>
      <BentoCardHeader>
        <BentoCardTitle>{title}</BentoCardTitle>
        {icon && <BentoCardIcon>{icon}</BentoCardIcon>}
      </BentoCardHeader>
      <BentoCardContent>
        <p className="font-display text-3xl font-bold text-forest-800 dark:text-forest-100">
          {value}
        </p>
        {change && (
          <p className={cn('mt-1 text-sm', changeColors[changeType])}>
            {change}
          </p>
        )}
      </BentoCardContent>
    </BentoCard>
  )
}
