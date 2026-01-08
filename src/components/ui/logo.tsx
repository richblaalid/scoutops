import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  variant?: 'full' | 'icon' | 'wordmark'
  theme?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { icon: 32, wordmark: 'text-lg' },
  md: { icon: 40, wordmark: 'text-xl' },
  lg: { icon: 64, wordmark: 'text-3xl' },
}

export function Logo({
  className,
  variant = 'full',
  theme = 'light',
  size = 'md'
}: LogoProps) {
  const { icon: iconSize, wordmark: wordmarkClass } = sizes[size]

  const IconMark = () => (
    <svg
      viewBox="0 0 80 80"
      width={iconSize}
      height={iconSize}
      className="shrink-0"
    >
      {/* Outer ring */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke={theme === 'light' ? '#1B4332' : 'white'}
        strokeWidth="3"
      />

      {/* Compass cardinal points */}
      <path d="M40 8 L43 20 L40 17 L37 20 Z" fill="#D4A574"/>
      <path
        d="M72 40 L60 43 L63 40 L60 37 Z"
        fill={theme === 'light' ? '#1B4332' : 'white'}
      />
      <path
        d="M40 72 L37 60 L40 63 L43 60 Z"
        fill={theme === 'light' ? '#1B4332' : 'white'}
      />
      <path
        d="M8 40 L20 37 L17 40 L20 43 Z"
        fill={theme === 'light' ? '#1B4332' : 'white'}
      />

      {/* Center operational crosshair */}
      <circle cx="40" cy="40" r="8" fill={theme === 'light' ? '#1B4332' : 'white'}/>
      <circle cx="40" cy="40" r="4" fill="#D4A574"/>

      {/* Grid lines */}
      <line
        x1="25" y1="40" x2="32" y2="40"
        stroke={theme === 'light' ? '#2D6A4F' : 'rgba(255,255,255,0.6)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="48" y1="40" x2="55" y2="40"
        stroke={theme === 'light' ? '#2D6A4F' : 'rgba(255,255,255,0.6)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="40" y1="25" x2="40" y2="32"
        stroke={theme === 'light' ? '#2D6A4F' : 'rgba(255,255,255,0.6)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="40" y1="48" x2="40" y2="55"
        stroke={theme === 'light' ? '#2D6A4F' : 'rgba(255,255,255,0.6)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )

  const Wordmark = () => (
    <span className={cn('font-bold tracking-tight', wordmarkClass)}>
      <span className={theme === 'light' ? 'text-[#1B4332]' : 'text-white'}>Scout</span>
      <span className="text-[#D4A574]">Ops</span>
    </span>
  )

  if (variant === 'icon') {
    return (
      <div className={cn('inline-flex', className)}>
        <IconMark />
      </div>
    )
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn('inline-flex', className)}>
        <Wordmark />
      </div>
    )
  }

  // Full logo (icon + wordmark)
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <IconMark />
      <Wordmark />
    </div>
  )
}
