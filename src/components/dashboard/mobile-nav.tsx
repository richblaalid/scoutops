'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Settings, LogOut, Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getVisibleNavItems, isAdmin, isFinancialRole } from '@/lib/roles'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { UnitLogo } from './unit-logo'
import { useUnit } from '@/components/providers/unit-context'
import type { User } from '@supabase/supabase-js'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface MobileNavProps {
  user: User
  userName?: string | null
  className?: string
}

function getInitials(email: string, name?: string | null): string {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Admin',
    treasurer: 'Treasurer',
    leader: 'Leader',
    parent: 'Parent',
    scout: 'Scout',
  }
  return labels[role] || role
}

export function MobileNav({ user, userName, className }: MobileNavProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { currentRole } = useUnit()
  const navItems = currentRole ? getVisibleNavItems(currentRole) : []
  const initials = getInitials(user.email || '', userName)
  const userRole = currentRole || 'parent'

  const showUnitSettings = isAdmin(userRole)
  const showIntegrations = isFinancialRole(userRole)

  const closeMenu = () => setIsOpen(false)

  return (
    <header className={cn(
      "sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-sidebar-border bg-sidebar px-4",
      className
    )}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <div className="flex h-full flex-col">
            {/* Header Section: ChuckBox Logo - scaled to fit sidebar width */}
            <div className="flex items-center justify-center border-b border-sidebar-border px-4 py-4">
              <Link href="/" onClick={closeMenu} className="flex w-full items-center justify-center">
                <div className="origin-center scale-[0.95]">
                  <Logo variant="full" size="md" />
                </div>
              </Link>
            </div>

            {/* Unit Section */}
            <div className="border-b border-sidebar-border px-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <UnitLogo size="md" />
              </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* Admin/Treasurer Settings Section */}
            {(showUnitSettings || showIntegrations) && (
              <div className="border-t border-sidebar-border px-3 py-3">
                <ul className="space-y-1">
                  {showUnitSettings && (
                    <li>
                      <Link
                        href="/settings/unit"
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === '/settings/unit'
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Settings className="h-4 w-4" />
                        Unit Settings
                      </Link>
                    </li>
                  )}
                  {showIntegrations && (
                    <li>
                      <Link
                        href="/settings/integrations"
                        onClick={closeMenu}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === '/settings/integrations'
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Plug className="h-4 w-4" />
                        Integrations
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* User Section - avatar links to profile settings */}
            <div className="border-t border-sidebar-border px-3 py-3">
              <Link
                href="/settings"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-medium">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {userName || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleLabel(userRole)}
                  </p>
                </div>
              </Link>
              <a
                href="/logout"
                className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo in mobile header */}
      <Link href="/" className="flex items-center gap-2">
        <Logo variant="full" size="sm" />
      </Link>

      {/* Unit indicator in mobile header */}
      <div className="ml-auto flex items-center gap-2">
        <UnitLogo size="sm" />
      </div>
    </header>
  )
}
