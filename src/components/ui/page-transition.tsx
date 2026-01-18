'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'

/**
 * PageTransition wraps page content with fade animations
 * Uses opacity-only to avoid breaking fixed positioning of modals/dialogs
 * Respects prefers-reduced-motion for accessibility
 *
 * Note: Using simple fade without AnimatePresence mode="wait" to avoid
 * conflicts with Next.js App Router's internal state management
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
      className="motion-reduce:transition-none"
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeIn component for staggered list reveals
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.2,
  className,
}: {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggeredList for animating lists of items with delay
 */
export function StaggeredList({
  children,
  staggerDelay = 0.05,
  className,
}: {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
