'use client'

import { createContext, useContext, useState, useEffect, useSyncExternalStore, ReactNode, useCallback } from 'react'

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

const STORAGE_KEY = 'chuckbox_sidebar_collapsed'

// Use useSyncExternalStore for proper SSR hydration of localStorage values
function useLocalStorageCollapsed() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback)
    return () => window.removeEventListener('storage', callback)
  }, [])

  const getSnapshot = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }, [])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Use useSyncExternalStore to properly handle SSR hydration with localStorage
  const storedCollapsed = useLocalStorageCollapsed()
  const [isCollapsed, setIsCollapsedState] = useState(storedCollapsed)

  // Sync internal state when localStorage changes (e.g., from another tab)
  useEffect(() => {
    setIsCollapsedState(storedCollapsed)
  }, [storedCollapsed])

  // Wrapper to persist to localStorage when state changes
  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [])

  const toggleCollapsed = useCallback(() => setIsCollapsed(!isCollapsed), [isCollapsed, setIsCollapsed])

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}
