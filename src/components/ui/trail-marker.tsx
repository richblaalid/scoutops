'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  label: string
  description?: string
}

interface TrailMarkerProps {
  steps: Step[]
  currentStep: number
  className?: string
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * TrailMarker - A scout-themed progress indicator
 * Uses circular waypoints like trail blazes to show multi-step progress
 */
export function TrailMarker({
  steps,
  currentStep,
  className,
  orientation = 'horizontal',
  size = 'md',
}: TrailMarkerProps) {
  const sizeConfig = {
    sm: {
      marker: 'h-6 w-6',
      icon: 'h-3 w-3',
      text: 'text-xs',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    md: {
      marker: 'h-8 w-8',
      icon: 'h-4 w-4',
      text: 'text-sm',
      connector: orientation === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    lg: {
      marker: 'h-10 w-10',
      icon: 'h-5 w-5',
      text: 'text-base',
      connector: orientation === 'horizontal' ? 'h-1' : 'w-1',
    },
  }

  const config = sizeConfig[size]

  const isHorizontal = orientation === 'horizontal'

  return (
    <div
      className={cn(
        'flex',
        isHorizontal ? 'flex-row items-start' : 'flex-col',
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex',
                isHorizontal ? 'flex-col items-center' : 'flex-row items-start gap-3'
              )}
            >
              {/* Marker */}
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted
                    ? 'hsl(var(--success))'
                    : isCurrent
                    ? 'hsl(var(--primary))'
                    : 'transparent',
                  borderColor: isCompleted || isCurrent
                    ? isCompleted
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--primary))'
                    : 'hsl(var(--border))',
                }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'relative flex items-center justify-center rounded-full border-2',
                  config.marker,
                  isCompleted || isCurrent ? 'text-white' : 'text-stone-400'
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className={config.icon} />
                  </motion.div>
                ) : (
                  <span className={cn('font-semibold', config.text)}>
                    {index + 1}
                  </span>
                )}

                {/* Pulse animation for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-forest-500"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.5 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <div
                className={cn(
                  isHorizontal ? 'mt-2 text-center' : 'flex-1',
                  'min-w-0'
                )}
              >
                <p
                  className={cn(
                    'font-medium',
                    config.text,
                    isCompleted || isCurrent
                      ? 'text-forest-800 dark:text-forest-200'
                      : 'text-stone-500'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      'mt-0.5 text-xs text-stone-500 dark:text-stone-400',
                      isHorizontal && 'max-w-[100px]'
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'flex-1',
                  isHorizontal
                    ? 'mx-2 mt-4 min-w-[40px]'
                    : 'ml-4 my-2 min-h-[24px]'
                )}
              >
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted
                      ? 'hsl(var(--success))'
                      : 'hsl(var(--border))',
                  }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'rounded-full',
                    isHorizontal ? 'h-0.5 w-full' : 'h-full w-0.5'
                  )}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/**
 * SimpleTrailMarker - A compact version for inline use
 */
export function SimpleTrailMarker({
  total,
  current,
  className,
}: {
  total: number
  current: number
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: total }).map((_, index) => {
        const isCompleted = index < current
        const isCurrent = index === current

        return (
          <motion.div
            key={index}
            initial={false}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              backgroundColor: isCompleted
                ? 'hsl(var(--success))'
                : isCurrent
                ? 'hsl(var(--primary))'
                : 'hsl(var(--border))',
            }}
            transition={{ duration: 0.2 }}
            className="h-2 w-2 rounded-full"
          />
        )
      })}
    </div>
  )
}

/**
 * TrailProgress - A linear progress bar with trail-style endpoints
 */
export function TrailProgress({
  value,
  max = 100,
  showValue = false,
  className,
}: {
  value: number
  max?: number
  showValue?: boolean
  className?: string
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-forest-600 to-forest-500"
        />
        {/* Trail marker at current position */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-forest-500 shadow-sm"
        />
      </div>
      {showValue && (
        <div className="flex justify-between text-xs text-stone-500">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
