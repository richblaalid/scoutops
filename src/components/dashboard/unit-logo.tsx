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
  const { currentUnit, isLeaderWithSection, leaderSection } = useUnit()

  const { width, height, className } = sizes[size]

  // Determine what to display
  const logoUrl = currentUnit?.logo_url
  const altText = isLeaderWithSection && leaderSection
    ? `Troop ${leaderSection.unit_number}`
    : currentUnit?.name || 'Unit logo'

  // Fallback text when no logo
  const fallbackText = isLeaderWithSection && leaderSection
    ? { primary: `Troop ${leaderSection.unit_number}`, secondary: leaderSection.unit_gender }
    : { primary: currentUnit?.name || '', secondary: null }

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
        {fallbackText.primary}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-medium text-sidebar-foreground text-center">
        {fallbackText.primary}
      </span>
      {fallbackText.secondary && (
        <span className="text-sm text-muted-foreground capitalize">
          {fallbackText.secondary}
        </span>
      )}
    </div>
  )
}
