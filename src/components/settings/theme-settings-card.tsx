'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ThemeOption = 'light' | 'dark' | 'system'

const themeOptions: { value: ThemeOption; label: string; description: string; icon: typeof Sun }[] = [
  {
    value: 'light',
    label: 'Day Mode',
    description: 'Cream and forest green palette',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Campfire Mode',
    description: 'Warm dark theme for evening use',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device settings',
    icon: Monitor,
  },
]

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how ChuckBox looks for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-3 rounded-lg border border-stone-200 p-4 opacity-50"
              >
                <div className="rounded-full bg-stone-100 p-2">
                  <option.icon className="h-5 w-5 text-stone-400" />
                </div>
                <div>
                  <p className="font-medium text-stone-900">{option.label}</p>
                  <p className="text-xs text-stone-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how ChuckBox looks for you
          {theme === 'system' && resolvedTheme && (
            <span className="ml-1 text-stone-400">
              (currently {resolvedTheme === 'dark' ? 'Campfire' : 'Day'} mode)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Label className="sr-only">Select theme</Label>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Theme selection">
          {themeOptions.map((option) => {
            const isSelected = theme === option.value
            const Icon = option.icon

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                  "hover:border-forest-300 hover:bg-forest-50 dark:hover:border-forest-700 dark:hover:bg-forest-900/20",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2",
                  isSelected
                    ? "border-forest-600 bg-forest-50 dark:border-forest-500 dark:bg-forest-900/30"
                    : "border-stone-200 dark:border-stone-700"
                )}
              >
                <div
                  className={cn(
                    "rounded-full p-2 transition-colors",
                    isSelected
                      ? "bg-forest-600 text-white"
                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      isSelected
                        ? "text-forest-800 dark:text-forest-200"
                        : "text-stone-900 dark:text-stone-100"
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="ml-auto">
                    <div className="h-2 w-2 rounded-full bg-forest-600 dark:bg-forest-400" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
