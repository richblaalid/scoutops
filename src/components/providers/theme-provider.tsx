'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * ThemeProvider - Handles dark/light mode theming
 *
 * Features:
 * - Respects system preference by default
 * - Allows user override via toggle in Settings
 * - Persists preference in localStorage
 * - Prevents flash of wrong theme on page load
 *
 * Theme values:
 * - 'light': Day mode (cream/forest brand colors)
 * - 'dark': Campfire mode (warm dark theme)
 * - 'system': Follow OS/browser preference
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      disableTransitionOnChange
      storageKey="chuckbox-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
