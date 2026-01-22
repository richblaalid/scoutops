'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { BsaMeritBadge } from '@/types/advancement'

interface MeritBadgeIconProps {
  badge: BsaMeritBadge
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBorder?: boolean
}

// Category-based color schemes (kept for getCategoryColors export)
const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'Outdoor Skills': {
    bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: 'text-emerald-600',
  },
  Citizenship: {
    bg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: 'text-blue-600',
  },
  'Personal Development': {
    bg: 'bg-gradient-to-br from-violet-100 to-violet-200',
    border: 'border-violet-300',
    text: 'text-violet-800',
    icon: 'text-violet-600',
  },
  Nature: {
    bg: 'bg-gradient-to-br from-green-100 to-green-200',
    border: 'border-green-300',
    text: 'text-green-800',
    icon: 'text-green-600',
  },
  'Health & Safety': {
    bg: 'bg-gradient-to-br from-red-100 to-red-200',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: 'text-red-600',
  },
  'Arts & Hobbies': {
    bg: 'bg-gradient-to-br from-orange-100 to-orange-200',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: 'text-orange-600',
  },
  'Science & Technology': {
    bg: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
    border: 'border-cyan-300',
    text: 'text-cyan-800',
    icon: 'text-cyan-600',
  },
  'Trades & Skills': {
    bg: 'bg-gradient-to-br from-amber-100 to-amber-200',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: 'text-amber-600',
  },
  Aquatics: {
    bg: 'bg-gradient-to-br from-sky-100 to-sky-200',
    border: 'border-sky-300',
    text: 'text-sky-800',
    icon: 'text-sky-600',
  },
  Sports: {
    bg: 'bg-gradient-to-br from-lime-100 to-lime-200',
    border: 'border-lime-300',
    text: 'text-lime-800',
    icon: 'text-lime-600',
  },
  'Life Skills': {
    bg: 'bg-gradient-to-br from-indigo-100 to-indigo-200',
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    icon: 'text-indigo-600',
  },
}

const defaultColors = {
  bg: 'bg-gradient-to-br from-stone-100 to-stone-200',
  border: 'border-stone-300',
  text: 'text-stone-800',
  icon: 'text-stone-600',
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
}

// Map size to pixels for the sizes prop
const sizePixels = {
  sm: '40px',
  md: '56px',
  lg: '80px',
  xl: '112px',
}

export function MeritBadgeIcon({
  badge,
  size = 'md',
  className,
  showBorder = true,
}: MeritBadgeIconProps) {
  // All merit badges should have images - if not, show a placeholder
  if (!badge.image_url) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-full bg-stone-200',
          sizeClasses[size],
          showBorder && 'ring-2 ring-stone-200',
          badge.is_eagle_required && 'ring-amber-400',
          className
        )}
      >
        <span className="text-xs font-medium text-stone-500">
          {badge.name.charAt(0)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full',
        sizeClasses[size],
        showBorder && 'ring-2 ring-stone-200',
        badge.is_eagle_required && 'ring-amber-400',
        className
      )}
    >
      <Image
        src={badge.image_url}
        alt={badge.name}
        fill
        sizes={sizePixels[size]}
        className="object-cover"
      />
    </div>
  )
}

// Export color utilities for use elsewhere
export function getCategoryColors(category: string | null) {
  return categoryColors[category || ''] || defaultColors
}
