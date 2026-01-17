'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * SuccessCheckmark - Animated checkmark that draws itself
 * Use for form submissions, completions, and confirmations
 */
export function SuccessCheckmark({
  size = 'md',
  className,
  show = true,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  show?: boolean
}) {
  const sizeConfig = {
    sm: { container: 'h-12 w-12', stroke: 2 },
    md: { container: 'h-16 w-16', stroke: 2.5 },
    lg: { container: 'h-24 w-24', stroke: 3 },
  }

  const config = sizeConfig[size]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'flex items-center justify-center rounded-full bg-success',
            config.container,
            className
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-1/2 w-1/2"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * CampfireGlow - Warm radial gradient glow for success states
 * Creates emotional warmth at key moments
 */
export function CampfireGlow({
  show = true,
  children,
  className,
}: {
  show?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 -z-10 rounded-xl bg-gradient-radial from-tan-400/30 via-tan-300/10 to-transparent blur-xl"
          />
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}

/**
 * Confetti particle component
 * Random values are pre-computed and passed as props to avoid impure renders
 */
function ConfettiParticle({
  x,
  delay,
  color,
  yOffset,
  xOffset,
  rotation,
  duration,
}: {
  x: number
  delay: number
  color: string
  yOffset: number
  xOffset: number
  rotation: number
  duration: number
}) {
  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        y: -100 - yOffset,
        x: x + xOffset,
        opacity: 0,
        scale: 0.5,
        rotate: rotation,
      }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={cn('absolute h-2 w-2 rounded-full', color)}
      style={{ left: '50%', bottom: '50%' }}
    />
  )
}

const CONFETTI_COLORS = [
  'bg-tan-400',
  'bg-tan-500',
  'bg-forest-500',
  'bg-forest-600',
  'bg-success',
]

// Pre-generated particle configurations using deterministic values
// This avoids impure renders while still providing visual variety
const PARTICLE_VARIATIONS = [
  { yOffset: 25, xOffset: 10, rotation: 45, duration: 0.9 },
  { yOffset: 40, xOffset: -15, rotation: 120, duration: 1.0 },
  { yOffset: 15, xOffset: 5, rotation: 200, duration: 0.85 },
  { yOffset: 35, xOffset: -8, rotation: 280, duration: 1.1 },
  { yOffset: 20, xOffset: 18, rotation: 60, duration: 0.95 },
  { yOffset: 45, xOffset: -12, rotation: 150, duration: 1.05 },
  { yOffset: 30, xOffset: 8, rotation: 230, duration: 0.88 },
  { yOffset: 10, xOffset: -20, rotation: 310, duration: 1.15 },
  { yOffset: 38, xOffset: 15, rotation: 90, duration: 0.92 },
  { yOffset: 22, xOffset: -5, rotation: 180, duration: 1.02 },
  { yOffset: 48, xOffset: 12, rotation: 260, duration: 0.87 },
  { yOffset: 18, xOffset: -18, rotation: 340, duration: 1.08 },
]

/**
 * ConfettiBurst - Particle explosion for celebrating completions
 */
export function ConfettiBurst({
  show = true,
  particleCount = 12,
}: {
  show?: boolean
  particleCount?: number
}) {
  // Use deterministic particle configurations to ensure pure renders
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const variation = PARTICLE_VARIATIONS[i % PARTICLE_VARIATIONS.length]
    return {
      x: Math.sin((i / particleCount) * Math.PI * 2) * 60,
      delay: (i / particleCount) * 0.1,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      ...variation,
    }
  })

  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {particles.map((particle, i) => (
            <ConfettiParticle
              key={i}
              x={particle.x}
              delay={particle.delay}
              color={particle.color}
              yOffset={particle.yOffset}
              xOffset={particle.xOffset}
              rotation={particle.rotation}
              duration={particle.duration}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * SuccessCelebration - Complete celebration with checkmark, glow, and confetti
 * Use for major accomplishments like bulk updates, form submissions, etc.
 */
export function SuccessCelebration({
  show = true,
  message,
  subMessage,
  onComplete,
  className,
}: {
  show?: boolean
  message?: string
  subMessage?: string
  onComplete?: () => void
  className?: string
}) {
  React.useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            'flex flex-col items-center justify-center gap-4 py-8',
            className
          )}
        >
          <div className="relative">
            <CampfireGlow show={show}>
              <SuccessCheckmark show={show} size="lg" />
            </CampfireGlow>
            <ConfettiBurst show={show} />
          </div>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-semibold text-forest-800 dark:text-forest-200"
            >
              {message}
            </motion.p>
          )}
          {subMessage && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-stone-500 dark:text-stone-400"
            >
              {subMessage}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * CountUp - Animated number counter
 * Use for showing updated counts after bulk operations
 */
export function CountUp({
  value,
  duration = 1,
  className,
}: {
  value: number
  duration?: number
  className?: string
}) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const startValueRef = React.useRef(0)

  React.useEffect(() => {
    let startTime: number
    startValueRef.current = displayValue

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic

      setDisplayValue(Math.floor(startValueRef.current + (value - startValueRef.current) * eased))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
    // We intentionally only re-run when value or duration changes, not displayValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <span className={className}>{displayValue}</span>
}
