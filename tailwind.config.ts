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
        sans: ['var(--font-nunito)', 'Avenir Next', 'system-ui', 'sans-serif'],
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'forest': '0 4px 12px rgba(35, 77, 62, 0.3)',   // Pine 800
        'tan': '0 4px 12px rgba(232, 93, 4, 0.3)',       // Campfire 500
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
