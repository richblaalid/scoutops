'use client'

import Image from 'next/image'
import { useUnit } from '@/components/providers/unit-context'

interface UnitLogoProps {
  /** Size variant for different contexts */
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { width: 75, height: 75, className: 'h-[75px] w-[75px]' },
  md: { width: 200, height: 200, className: 'h-auto w-[200px]' },
  lg: { width: 200, height: 200, className: 'h-auto w-[200px]' },
}

export function UnitLogo({ size = 'md' }: UnitLogoProps) {
  const { currentUnit } = useUnit()

  const { width, height, className } = sizes[size]

  const logoUrl = currentUnit?.logo_url
  const altText = currentUnit?.name || 'Unit logo'
  const fallbackText = currentUnit?.name || ''

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={altText}
        width={width}
        height={height}
        className={`${className} rounded object-contain`}
      />
    )
  }

  // Text fallback
  if (size === 'sm') {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {fallbackText}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-medium text-sidebar-foreground text-center">
        {fallbackText}
      </span>
    </div>
  )
}
