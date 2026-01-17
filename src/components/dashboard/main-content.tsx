'use client'

import { useSidebar } from '@/components/providers/sidebar-context'
import { PageTransition } from '@/components/ui/page-transition'
import { cn } from '@/lib/utils'

interface MainContentProps {
  children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { isCollapsed } = useSidebar()

  return (
    <main className={cn(
      "min-h-screen bg-background transition-[margin] duration-300",
      isCollapsed ? "md:ml-16" : "md:ml-60"
    )}>
      <div className="container mx-auto px-4 py-8">
        <PageTransition>{children}</PageTransition>
      </div>
    </main>
  )
}
