import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'wordmark'
  theme?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Text sizes are calibrated to match icon height (icon uses 66/72 aspect ratio)
// sm: 32px icon → ~29px height → text-2xl (24px) + leading
// md: 40px icon → ~37px height → text-3xl (30px) + leading
// lg: 48px icon → ~44px height → text-4xl (36px) + leading - for headers
// xl: 64px icon → ~59px height → text-5xl (48px) + leading - for hero sections
const sizes = {
  sm: { icon: 32, wordmark: 'text-2xl leading-none' },
  md: { icon: 40, wordmark: 'text-3xl leading-none' },
  lg: { icon: 48, wordmark: 'text-4xl leading-none' },
  xl: { icon: 64, wordmark: 'text-5xl leading-none' },
}

// Chuckbox brand colors - Updated January 2026
// Aligned with marketing landing page: amber accent, deep forest greens
const brandColors = {
  light: {
    boxBody: '#14532d',      // Deep Pine (green-900)
    compartments: '#166534', // Forest Green (green-800)
    accent: '#b45309',       // Amber 700 - Primary accent
    wordPrimary: '#166534',  // Forest Green for "Chuck"
    wordAccent: '#b45309',   // Amber 700 for "Box"
  },
  dark: {
    boxBody: '#166534',      // Forest Green (green-800)
    compartments: '#22c55e', // Green 500
    accent: '#d97706',       // Amber 600
    wordPrimary: 'white',
    wordAccent: '#d97706',   // Amber 600
  }
}

function IconMark({ iconSize, colors }: { iconSize: number; colors: typeof brandColors.light }) {
  return (
    <svg
      viewBox="0 0 72 66"
      width={iconSize}
      height={Math.round(iconSize * 66 / 72)}
      className="shrink-0"
    >
      {/* Main box body */}
      <path d="M60.1818 10H11.8182C9.70946 10 8 11.7349 8 13.875V37.125C8 39.2651 9.70946 41 11.8182 41H60.1818C62.2905 41 64 39.2651 64 37.125V13.875C64 11.7349 62.2905 10 60.1818 10Z" fill={colors.boxBody}/>
      {/* Left leg */}
      <path d="M15.6924 40.6155L5.53857 60.9232" stroke={colors.boxBody} strokeWidth="5.07692" strokeLinecap="round"/>
      {/* Right leg */}
      <path d="M56.3076 40.6155L66.4615 60.9232" stroke={colors.boxBody} strokeWidth="5.07692" strokeLinecap="round"/>
      {/* Work surface (orange bar) */}
      <path d="M62.0195 43.1538H9.98099C8.92953 43.1538 8.07715 44.0062 8.07715 45.0577V48.8653C8.07715 49.9168 8.92953 50.7692 9.98099 50.7692H62.0195C63.0709 50.7692 63.9233 49.9168 63.9233 48.8653V45.0577C63.9233 44.0062 63.0709 43.1538 62.0195 43.1538Z" fill={colors.accent}/>
      {/* Top right compartment */}
      <path d="M57.9643 14H43.0357C41.9114 14 41 14.6716 41 15.5V22.5C41 23.3284 41.9114 24 43.0357 24H57.9643C59.0886 24 60 23.3284 60 22.5V15.5C60 14.6716 59.0886 14 57.9643 14Z" fill={colors.compartments}/>
      {/* Bottom right compartment */}
      <path d="M57.9643 28H43.0357C41.9114 28 41 28.6044 41 29.35V35.65C41 36.3956 41.9114 37 43.0357 37H57.9643C59.0886 37 60 36.3956 60 35.65V29.35C60 28.6044 59.0886 28 57.9643 28Z" fill={colors.compartments}/>
      {/* Left compartment */}
      <path d="M34.3214 14H14.6786C13.1992 14 12 15.5446 12 17.45V33.55C12 35.4554 13.1992 37 14.6786 37H34.3214C35.8008 37 37 35.4554 37 33.55V17.45C37 15.5446 35.8008 14 34.3214 14Z" fill={colors.compartments}/>
      {/* Center divider */}
      <path d="M36 11V40" stroke={colors.compartments} strokeWidth="2.53846"/>
    </svg>
  )
}

function Wordmark({ wordmarkClass, colors }: { wordmarkClass: string; colors: typeof brandColors.light }) {
  return (
    <span className={cn('font-bold tracking-tight whitespace-nowrap', wordmarkClass)}>
      <span style={{ color: colors.wordPrimary }}>Chuck</span>
      <span style={{ color: colors.wordAccent }}>Box</span>
    </span>
  )
}

export function Logo({
  className,
  variant = 'full',
  theme = 'light',
  size = 'md'
}: LogoProps) {
  const { icon: iconSize, wordmark: wordmarkClass } = sizes[size]
  const colors = brandColors[theme]

  if (variant === 'icon') {
    return (
      <div className={cn('inline-flex', className)}>
        <IconMark iconSize={iconSize} colors={colors} />
      </div>
    )
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn('inline-flex', className)}>
        <Wordmark wordmarkClass={wordmarkClass} colors={colors} />
      </div>
    )
  }

  // Full logo (icon + wordmark)
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <IconMark iconSize={iconSize} colors={colors} />
      <Wordmark wordmarkClass={wordmarkClass} colors={colors} />
    </div>
  )
}
