'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Dynamic import of ScoutbookSyncCard - defers 1,349 line component
const ScoutbookSyncCard = dynamic(
  () => import('./scoutbook-sync-card').then(mod => ({ default: mod.ScoutbookSyncCard })),
  {
    loading: () => (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          <span className="ml-2 text-stone-500">Loading sync options...</span>
        </CardContent>
      </Card>
    ),
  }
)

interface ScoutbookSyncCardLazyProps {
  lastSyncAt?: string | null
  lastSyncMemberCount?: number | null
  isAdmin: boolean
}

export function ScoutbookSyncCardLazy(props: ScoutbookSyncCardLazyProps) {
  return <ScoutbookSyncCard {...props} />
}
