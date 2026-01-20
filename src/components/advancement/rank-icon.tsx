'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Compass,
  Footprints,
  Shield,
  Award,
  Star,
  Heart,
  Crown,
} from 'lucide-react'

interface RankIconProps {
  rank: {
    code: string
    name: string
    image_url?: string | null
  }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showName?: boolean
  className?: string
}

// Rank-specific colors and icons
const rankConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    bgGradient: string
    iconColor: string
    borderColor: string
  }
> = {
  scout: {
    icon: Compass,
    bgGradient: 'from-emerald-500 to-emerald-700',
    iconColor: 'text-white',
    borderColor: 'ring-emerald-300',
  },
  tenderfoot: {
    icon: Footprints,
    bgGradient: 'from-green-500 to-green-700',
    iconColor: 'text-white',
    borderColor: 'ring-green-300',
  },
  second_class: {
    icon: Shield,
    bgGradient: 'from-teal-500 to-teal-700',
    iconColor: 'text-white',
    borderColor: 'ring-teal-300',
  },
  first_class: {
    icon: Award,
    bgGradient: 'from-cyan-500 to-cyan-700',
    iconColor: 'text-white',
    borderColor: 'ring-cyan-300',
  },
  star: {
    icon: Star,
    bgGradient: 'from-amber-400 to-amber-600',
    iconColor: 'text-white',
    borderColor: 'ring-amber-300',
  },
  life: {
    icon: Heart,
    bgGradient: 'from-red-500 to-red-700',
    iconColor: 'text-white',
    borderColor: 'ring-red-300',
  },
  eagle: {
    icon: Crown,
    bgGradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    iconColor: 'text-white',
    borderColor: 'ring-yellow-400',
  },
}

const sizeConfig = {
  sm: {
    container: 'h-8 w-8',
    image: 'h-6 w-6',
    icon: 'h-4 w-4',
    ring: 'ring-1',
  },
  md: {
    container: 'h-12 w-12',
    image: 'h-10 w-10',
    icon: 'h-6 w-6',
    ring: 'ring-2',
  },
  lg: {
    container: 'h-16 w-16',
    image: 'h-14 w-14',
    icon: 'h-8 w-8',
    ring: 'ring-2',
  },
  xl: {
    container: 'h-24 w-24',
    image: 'h-20 w-20',
    icon: 'h-12 w-12',
    ring: 'ring-3',
  },
}

export function RankIcon({ rank, size = 'md', showName = false, className }: RankIconProps) {
  const [imageError, setImageError] = useState(false)
  const config = rankConfig[rank.code] || rankConfig.scout
  const sizeClasses = sizeConfig[size]
  const IconComponent = config.icon

  // Use image if available and not errored
  if (rank.image_url && !imageError) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <img
          src={rank.image_url}
          alt={rank.name}
          className={cn(sizeClasses.image, 'object-contain')}
          onError={() => setImageError(true)}
        />
        {showName && (
          <span className="text-xs font-medium text-stone-700">{rank.name}</span>
        )}
      </div>
    )
  }

  // Fallback to icon
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br shadow-md',
          config.bgGradient,
          sizeClasses.container,
          sizeClasses.ring,
          config.borderColor
        )}
      >
        <IconComponent className={cn(sizeClasses.icon, config.iconColor)} />
      </div>
      {showName && (
        <span className="text-xs font-medium text-stone-700">{rank.name}</span>
      )}
    </div>
  )
}

// Export rank colors for use in other components
export function getRankColors(code: string) {
  return rankConfig[code] || rankConfig.scout
}
