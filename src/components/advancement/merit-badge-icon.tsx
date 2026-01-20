'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useState } from 'react'
import {
  Tent,
  Flag,
  Globe,
  Heart,
  Leaf,
  Flame,
  Compass,
  Mountain,
  Fish,
  Bird,
  TreePine,
  Bike,
  Waves,
  Shield,
  Wrench,
  Camera,
  Music,
  Palette,
  BookOpen,
  Calculator,
  Microscope,
  Rocket,
  Cpu,
  Radio,
  Hammer,
  Award,
  type LucideIcon,
} from 'lucide-react'

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
  pamphlet_url?: string | null
}

interface MeritBadgeIconProps {
  badge: MeritBadge
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBorder?: boolean
}

// Category-based color schemes
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

// Badge code to icon mapping
const iconMap: Record<string, LucideIcon> = {
  camping: Tent,
  hiking: Mountain,
  swimming: Waves,
  cycling: Bike,
  fishing: Fish,
  bird_study: Bird,
  environmental_science: Leaf,
  forestry: TreePine,
  fire_safety: Flame,
  orienteering: Compass,
  citizenship_community: Flag,
  citizenship_nation: Flag,
  citizenship_world: Globe,
  citizenship_society: Flag,
  first_aid: Heart,
  emergency_preparedness: Shield,
  lifesaving: Heart,
  personal_fitness: Heart,
  personal_management: BookOpen,
  family_life: Heart,
  communication: Radio,
  cooking: Flame,
  photography: Camera,
  music: Music,
  art: Palette,
  reading: BookOpen,
  scholarship: BookOpen,
  entrepreneurship: Calculator,
  chemistry: Microscope,
  astronomy: Rocket,
  electricity: Cpu,
  electronics: Cpu,
  robotics: Cpu,
  programming: Cpu,
  digital_technology: Cpu,
  woodwork: Hammer,
  metalwork: Wrench,
  plumbing: Wrench,
  automotive_maintenance: Wrench,
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
  xl: 'h-28 w-28',
}

const iconSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
}

const borderClasses = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-3',
  xl: 'border-4',
}

// Helper component to render the badge icon
function BadgeIconDisplay({
  code,
  iconClassName
}: {
  code: string
  iconClassName: string
}) {
  const Icon = iconMap[code] || Award
  return <Icon className={iconClassName} />
}

export function MeritBadgeIcon({
  badge,
  size = 'md',
  className,
  showBorder = true,
}: MeritBadgeIconProps) {
  const [imageError, setImageError] = useState(false)
  const colors = categoryColors[badge.category || ''] || defaultColors

  // If we have an image URL and it hasn't errored, show the image
  if (badge.image_url && !imageError) {
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
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Fallback: Beautiful generated icon
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        sizeClasses[size],
        colors.bg,
        showBorder && borderClasses[size],
        showBorder && colors.border,
        badge.is_eagle_required && showBorder && 'border-amber-400 ring-2 ring-amber-200',
        'shadow-sm',
        className
      )}
    >
      {/* Inner circle effect */}
      <div className="absolute inset-1 rounded-full bg-white/40" />

      {/* Icon */}
      <BadgeIconDisplay
        code={badge.code}
        iconClassName={cn(iconSizeClasses[size], colors.icon, 'relative z-10')}
      />
    </div>
  )
}

// Export color utilities for use elsewhere
export function getCategoryColors(category: string | null) {
  return categoryColors[category || ''] || defaultColors
}
