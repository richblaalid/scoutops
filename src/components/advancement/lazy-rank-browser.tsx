'use client'

import { useEffect, useState } from 'react'
import { RankRequirementsBrowser } from './rank-requirements-browser'
import { getRankBrowserData, getRankRequirementsForUnit } from '@/app/actions/advancement'
import { Skeleton } from '@/components/ui/skeleton'

// Types matching what RankRequirementsBrowser expects
interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
}

interface Requirement {
  id: string
  version_year: number | null
  rank_id: string
  requirement_number: string
  parent_requirement_id: string | null
  sub_requirement_letter: string | null
  description: string
  is_alternative: boolean | null
  alternatives_group: string | null
  display_order: number
}

interface RankRequirementProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RankRequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
}

interface PrefetchedRankData {
  ranks: Rank[]
  requirements: Requirement[]
  scouts: Scout[]
}

interface LazyRankBrowserProps {
  unitId: string
  canEdit: boolean
  currentUserName?: string
  // Optional prefetched data from server - if provided, skip client fetch
  prefetchedData?: PrefetchedRankData
}

function RankBrowserSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function LazyRankBrowser({
  unitId,
  canEdit,
  currentUserName = 'Leader',
  prefetchedData,
}: LazyRankBrowserProps) {
  const [isLoading, setIsLoading] = useState(!prefetchedData)
  const [error, setError] = useState<string | null>(null)
  const [ranks, setRanks] = useState<Rank[]>(prefetchedData?.ranks || [])
  const [requirements, setRequirements] = useState<Requirement[]>(prefetchedData?.requirements || [])
  const [scouts, setScouts] = useState<Scout[]>(prefetchedData?.scouts || [])

  useEffect(() => {
    // Skip fetch if we have prefetched data
    if (prefetchedData) {
      return
    }

    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch ranks/requirements and scouts in parallel
        const [rankDataResult, scoutDataResult] = await Promise.all([
          getRankRequirementsForUnit(),
          getRankBrowserData(unitId),
        ])

        if (!rankDataResult.success) {
          setError(rankDataResult.error || 'Failed to load rank data')
          return
        }

        if (!scoutDataResult.success) {
          setError(scoutDataResult.error || 'Failed to load scout data')
          return
        }

        setRanks(rankDataResult.data?.ranks || [])
        setRequirements(rankDataResult.data?.requirements || [])
        setScouts(scoutDataResult.data?.scouts || [])
      } catch (err) {
        console.error('Error loading rank browser data:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [unitId, prefetchedData])

  if (isLoading) {
    return <RankBrowserSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <RankRequirementsBrowser
      ranks={ranks}
      requirements={requirements}
      scouts={scouts}
      unitId={unitId}
      canEdit={canEdit}
      currentUserName={currentUserName}
    />
  )
}
