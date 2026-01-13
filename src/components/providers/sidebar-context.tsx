'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextValue {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Start with false to match server render, then sync with localStorage after mount
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Sync with localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('chuckbox_sidebar_collapsed')
    if (stored === 'true') {
      setIsCollapsed(true)
    }
    setHasMounted(true)
  }, [])

  // Persist collapsed state to localStorage after initial mount
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem('chuckbox_sidebar_collapsed', String(isCollapsed))
    }
  }, [isCollapsed, hasMounted])

  const toggleCollapsed = () => setIsCollapsed(prev => !prev)

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}
