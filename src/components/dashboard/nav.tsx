'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

interface DashboardNavProps {
  user: User
  membership: {
    role: string
    units: {
      name: string
      unit_number: string
    } | null
  } | null
}

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/scouts', label: 'Scouts' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/billing', label: 'Billing' },
  { href: '/payments', label: 'Payments' },
  { href: '/reports', label: 'Reports' },
  { href: '/members', label: 'Members' },
]

export function DashboardNav({ user, membership }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">ScoutOps</span>
            {membership?.units && (
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {membership.units.name}
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
            {membership && (
              <p className="text-xs text-gray-500 capitalize">{membership.role}</p>
            )}
          </div>
          <a
            href="/logout"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign Out
          </a>
        </div>
      </div>
    </header>
  )
}
