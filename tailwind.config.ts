import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Display font - Bricolage Grotesque for headings and emphasis
        display: ['var(--font-bricolage)', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        // Body font - DM Sans for readable body text
        sans: ['var(--font-dm-sans)', 'var(--font-bricolage)', 'system-ui', 'sans-serif'],
        // Serif for editorial moments
        serif: ['var(--font-source-serif)', 'Georgia', 'serif'],
      },
      colors: {
        // Semantic colors (mapped to CSS variables)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Chuckbox Brand Colors - Pine (keeping 'forest' name for compatibility)
        forest: {
          50: '#E8F5EE',
          100: '#D1EBDD',
          200: '#A3D7BB',
          300: '#75C399',
          400: '#52796F',
          500: '#52A07E',   // Pine 500
          600: '#3D8B6A',   // Pine 600
          700: '#2D6A4F',   // Pine 700
          800: '#234D3E',   // Pine 800 - Primary brand
          900: '#1A3A2F',   // Pine 900
          DEFAULT: '#234D3E',
        },
        // Chuckbox Brand Colors - Campfire (keeping 'tan' name for compatibility)
        tan: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FAA307',   // Campfire 300
          400: '#F48C06',   // Campfire 400
          500: '#E85D04',   // Campfire 500 - Primary accent
          600: '#C2410C',
          700: '#9A3412',
          800: '#7C2D12',
          900: '#431407',
          DEFAULT: '#E85D04',
        },
        // Chuckbox Brand Colors - Cream backgrounds
        cream: {
          100: '#FFFDF9',
          300: '#FAF3EB',   // Page background
          400: '#F5E6D3',   // Card accents
          DEFAULT: '#FAF3EB',
        },
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },

        // Semantic status colors
        success: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
          dark: '#047857',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        info: {
          DEFAULT: '#0284C7',
          light: '#E0F2FE',
          dark: '#0369A1',
        },

        // Change-type semantic colors (for sync, diff, and status indicators)
        'change-create': {
          DEFAULT: '#16A34A',      // green-600
          light: '#DCFCE7',        // green-100
          dark: '#15803D',         // green-700
          foreground: '#15803D',   // green-700 for text on light bg
        },
        'change-update': {
          DEFAULT: '#2563EB',      // blue-600
          light: '#DBEAFE',        // blue-100
          dark: '#1D4ED8',         // blue-700
          foreground: '#1D4ED8',   // blue-700 for text on light bg
        },
        'change-skip': {
          DEFAULT: '#D97706',      // amber-600
          light: '#FEF3C7',        // amber-100
          dark: '#B45309',         // amber-700
          foreground: '#B45309',   // amber-700 for text on light bg
        },
        'change-match': {
          DEFAULT: '#9333EA',      // purple-600
          light: '#F3E8FF',        // purple-100
          dark: '#7E22CE',         // purple-700
          foreground: '#7E22CE',   // purple-700 for text on light bg
        },
        'change-delete': {
          DEFAULT: '#DC2626',      // red-600
          light: '#FEE2E2',        // red-100
          dark: '#B91C1C',         // red-700
          foreground: '#B91C1C',   // red-700 for text on light bg
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        // Elevation system with forest-tinted shadows for brand consistency
        'xs': '0 1px 2px rgba(35, 77, 62, 0.05)',
        'sm': '0 1px 3px rgba(35, 77, 62, 0.08), 0 1px 2px rgba(35, 77, 62, 0.06)',
        'md': '0 4px 6px rgba(35, 77, 62, 0.08), 0 2px 4px rgba(35, 77, 62, 0.06)',
        'lg': '0 10px 15px rgba(35, 77, 62, 0.08), 0 4px 6px rgba(35, 77, 62, 0.05)',
        'xl': '0 20px 25px rgba(35, 77, 62, 0.10), 0 8px 10px rgba(35, 77, 62, 0.04)',
        '2xl': '0 25px 50px rgba(35, 77, 62, 0.15)',
        // Brand-specific accent shadows
        'forest': '0 4px 12px rgba(35, 77, 62, 0.3)',   // Pine 800
        'tan': '0 4px 12px rgba(232, 93, 4, 0.3)',       // Campfire 500
        // Campfire glow for success states
        'glow': '0 0 20px rgba(232, 93, 4, 0.25)',
        'glow-lg': '0 0 40px rgba(232, 93, 4, 0.3)',
      },
      backgroundImage: {
        // Radial gradient for campfire glow effect
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Subtle warm gradients for depth
        'gradient-warm': 'linear-gradient(180deg, hsl(33, 56%, 97%) 0%, hsl(33, 56%, 95%) 100%)',
        'gradient-forest': 'linear-gradient(180deg, hsl(157, 39%, 25%) 0%, hsl(157, 39%, 22%) 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
