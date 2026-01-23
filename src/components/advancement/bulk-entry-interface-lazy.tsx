'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import of BulkEntryInterface - defers 1,136 line component
const BulkEntryInterface = dynamic(
  () => import('./bulk-entry-interface').then(mod => ({ default: mod.BulkEntryInterface })),
  {
    loading: () => (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-forest-500" />
        <p className="mt-4 text-stone-500">Loading bulk entry interface...</p>
      </div>
    ),
  }
)

interface Rank {
  id: string
  code: string
  name: string
  display_order: number
}

interface Requirement {
  id: string
  rank_id?: string
  merit_badge_id?: string
  requirement_number: string
  sub_requirement_letter: string | null
  description: string
  display_order: number
}

interface Badge {
  id: string
  code: string
  name: string
  category: string | null
  is_eagle_required: boolean | null
}

interface RankReqProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RankReqProgress[]
}

interface BadgeReqProgress {
  id: string
  requirement_id: string
  status: string
}

interface BadgeProgress {
  id: string
  merit_badge_id: string
  status: string
  scout_merit_badge_requirement_progress: BadgeReqProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
  scout_merit_badge_progress: BadgeProgress[]
}

interface BulkEntryInterfaceLazyProps {
  ranks: Rank[]
  rankRequirements: Requirement[]
  badges: Badge[]
  badgeRequirements: Requirement[]
  scouts: Scout[]
  unitId: string
}

export function BulkEntryInterfaceLazy(props: BulkEntryInterfaceLazyProps) {
  return <BulkEntryInterface {...props} />
}
