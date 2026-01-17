'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Home,
  FileText,
  ArrowRight,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  href?: string
  action?: () => void
  keywords?: string[]
  category: 'navigation' | 'action' | 'scout' | 'recent'
}

const defaultCommands: CommandItem[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Go to dashboard',
    icon: Home,
    href: '/',
    keywords: ['dashboard', 'main', 'start'],
    category: 'navigation',
  },
  {
    id: 'scouts',
    label: 'Scouts',
    description: 'View and manage scouts',
    icon: Users,
    href: '/scouts',
    keywords: ['members', 'kids', 'roster'],
    category: 'navigation',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Manage billing and payments',
    icon: DollarSign,
    href: '/billing',
    keywords: ['payments', 'dues', 'money', 'charges'],
    category: 'navigation',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'View upcoming events',
    icon: Calendar,
    href: '/events',
    keywords: ['calendar', 'activities', 'meetings'],
    category: 'navigation',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'View financial reports',
    icon: FileText,
    href: '/reports',
    keywords: ['analytics', 'data', 'summary'],
    category: 'navigation',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage unit settings',
    icon: Settings,
    href: '/settings',
    keywords: ['preferences', 'config', 'options'],
    category: 'navigation',
  },
]

interface CommandPaletteContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

/**
 * CommandPaletteProvider - Manages command palette state
 * Handles Cmd+K / Ctrl+K keyboard shortcut
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), [])

  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggle, close])

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  )
}

/**
 * CommandPalette - The actual palette UI
 */
function CommandPalette() {
  const { isOpen, close } = useCommandPalette()
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    if (!query) return defaultCommands
    const lowerQuery = query.toLowerCase()
    return defaultCommands.filter((cmd) => {
      return (
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords?.some((k) => k.includes(lowerQuery))
      )
    })
  }, [query])

  // Reset selection when query changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected) {
          executeCommand(selected)
        }
        break
    }
  }

  const executeCommand = (cmd: CommandItem) => {
    if (cmd.href) {
      router.push(cmd.href)
    } else if (cmd.action) {
      cmd.action()
    }
    close()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-800"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-stone-200 px-4 dark:border-stone-700">
              <Search className="h-5 w-5 text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands..."
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400 dark:text-stone-100"
              />
              <kbd className="hidden rounded border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs text-stone-500 sm:inline-block dark:border-stone-600 dark:bg-stone-700 dark:text-stone-400">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-sm text-stone-500">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCommands.map((cmd, index) => {
                    const Icon = cmd.icon
                    const isSelected = index === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-forest-700 text-white'
                            : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            isSelected ? 'text-white' : 'text-stone-400'
                          )}
                        />
                        <div className="flex-1 truncate">
                          <div className="font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div
                              className={cn(
                                'text-sm truncate',
                                isSelected ? 'text-white/80' : 'text-stone-500 dark:text-stone-400'
                              )}
                            >
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-2 text-xs text-stone-500 dark:border-stone-700">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 dark:border-stone-600 dark:bg-stone-700">↑</kbd>
                  <kbd className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 dark:border-stone-600 dark:bg-stone-700">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 dark:border-stone-600 dark:bg-stone-700">↵</kbd>
                  <span className="ml-1">Select</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>K to toggle</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * CommandPaletteTrigger - Button to open the command palette
 * Can be placed in the header/sidebar
 */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { open } = useCommandPalette()

  return (
    <button
      onClick={open}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500 transition-colors hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-700',
        className
      )}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="ml-auto hidden rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-xs sm:inline-block dark:border-stone-600 dark:bg-stone-700">
        ⌘K
      </kbd>
    </button>
  )
}
