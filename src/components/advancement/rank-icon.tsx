'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

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

// Hardcoded rank image URLs - these are the official BSA rank badge images
const RANK_IMAGES: Record<string, string> = {
  scout: '/images/ranks/scout100.png',
  tenderfoot: '/images/ranks/tenderfoot100.png',
  second_class: '/images/ranks/secondclass100.png',
  first_class: '/images/ranks/firstclass100.png',
  star: '/images/ranks/star100.png',
  life: '/images/ranks/life100.png',
  eagle: '/images/ranks/eagle.png',
}

const sizeConfig = {
  sm: {
    container: 'h-8 w-8',
    image: 'h-6 w-6',
    pixels: 24,
  },
  md: {
    container: 'h-12 w-12',
    image: 'h-10 w-10',
    pixels: 40,
  },
  lg: {
    container: 'h-16 w-16',
    image: 'h-14 w-14',
    pixels: 56,
  },
  xl: {
    container: 'h-24 w-24',
    image: 'h-20 w-20',
    pixels: 80,
  },
}

export function RankIcon({ rank, size = 'md', showName = false, className }: RankIconProps) {
  const sizeClasses = sizeConfig[size]

  // Get image URL from prop or fall back to hardcoded map
  const imageUrl = rank.image_url || RANK_IMAGES[rank.code]

  if (!imageUrl) {
    // No image available - show placeholder with rank name
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-stone-200 text-stone-500',
            sizeClasses.container
          )}
        >
          <span className="text-xs font-medium">{rank.name.charAt(0)}</span>
        </div>
        {showName && (
          <span className="text-xs font-medium text-stone-700">{rank.name}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <Image
        src={imageUrl}
        alt={rank.name}
        width={sizeClasses.pixels}
        height={sizeClasses.pixels}
        className="object-contain"
      />
      {showName && (
        <span className="text-xs font-medium text-stone-700">{rank.name}</span>
      )}
    </div>
  )
}

// Export rank colors for use in other components (keeping for backward compatibility)
export function getRankColors(code: string) {
  const colors: Record<string, { bgGradient: string; iconColor: string; borderColor: string }> = {
    scout: { bgGradient: 'from-emerald-500 to-emerald-700', iconColor: 'text-white', borderColor: 'ring-emerald-300' },
    tenderfoot: { bgGradient: 'from-green-500 to-green-700', iconColor: 'text-white', borderColor: 'ring-green-300' },
    second_class: { bgGradient: 'from-teal-500 to-teal-700', iconColor: 'text-white', borderColor: 'ring-teal-300' },
    first_class: { bgGradient: 'from-cyan-500 to-cyan-700', iconColor: 'text-white', borderColor: 'ring-cyan-300' },
    star: { bgGradient: 'from-amber-400 to-amber-600', iconColor: 'text-white', borderColor: 'ring-amber-300' },
    life: { bgGradient: 'from-red-500 to-red-700', iconColor: 'text-white', borderColor: 'ring-red-300' },
    eagle: { bgGradient: 'from-yellow-500 via-amber-500 to-yellow-600', iconColor: 'text-white', borderColor: 'ring-yellow-400' },
  }
  return colors[code] || colors.scout
}
