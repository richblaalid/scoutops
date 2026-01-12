'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getVisibleNavItems } from '@/lib/roles'
import { UserMenu } from './user-menu'
import { Logo } from '@/components/ui/logo'
import { UnitSwitcher } from './unit-switcher'
import { SectionFilter } from './section-filter'
import { useUnit } from '@/components/providers/unit-context'
import type { User } from '@supabase/supabase-js'

interface DashboardNavProps {
  user: User
  userName?: string | null
}

export function DashboardNav({ user, userName }: DashboardNavProps) {
  const pathname = usePathname()
  const { currentUnit, currentRole, units, hasSections } = useUnit()
  const navItems = currentRole ? getVisibleNavItems(currentRole) : []

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo variant="full" size="sm" />
          </Link>

          {/* Unit name/switcher and section filter */}
          <div className="flex items-center gap-3">
            {units.length > 1 ? (
              <UnitSwitcher />
            ) : currentUnit && (
              <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                {currentUnit.name}
              </span>
            )}

            {/* Section filter for linked troops */}
            {hasSections && <SectionFilter />}
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-forest-50 text-forest-700'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <UserMenu
          email={user.email || ''}
          name={userName}
          role={currentRole ?? undefined}
        />
      </div>
    </header>
  )
}
