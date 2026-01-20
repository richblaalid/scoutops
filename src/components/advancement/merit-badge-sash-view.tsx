'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { SashBadgeSlot } from './sash-badge-slot'
import { StartBadgeSearchDialog } from './start-badge-search-dialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Plus, Star, Medal } from 'lucide-react'

interface MeritBadgeProgress {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  awarded_at: string | null
  counselor_name: string | null
  bsa_merit_badges: {
    id: string
    code: string | null
    name: string
    is_eagle_required: boolean | null
    category: string | null
    image_url?: string | null
  }
  scout_merit_badge_requirement_progress: Array<{
    id: string
    status: string
    completed_at: string | null
  }>
}

interface MeritBadgeSashViewProps {
  meritBadgeProgress: MeritBadgeProgress[]
  onBadgeClick: (badge: MeritBadgeProgress) => void
  scoutId: string
  unitId: string
  canEdit: boolean
}

export function MeritBadgeSashView({
  meritBadgeProgress,
  onBadgeClick,
  scoutId,
  unitId,
  canEdit,
}: MeritBadgeSashViewProps) {
  const [eagleExpanded, setEagleExpanded] = useState(true)
  const [electivesExpanded, setElectivesExpanded] = useState(true)
  const [startDialogOpen, setStartDialogOpen] = useState(false)

  // Split badges into Eagle Required and Electives
  const { eagleRequired, electives } = useMemo(() => {
    const eagle: MeritBadgeProgress[] = []
    const elective: MeritBadgeProgress[] = []

    meritBadgeProgress.forEach(badge => {
      if (badge.bsa_merit_badges.is_eagle_required === true) {
        eagle.push(badge)
      } else {
        elective.push(badge)
      }
    })

    // Sort each array: earned first, then in progress, alphabetically within each group
    const sortByStatus = (a: MeritBadgeProgress, b: MeritBadgeProgress) => {
      const statusOrder = { awarded: 0, approved: 0, completed: 1, in_progress: 2 }
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.bsa_merit_badges.name.localeCompare(b.bsa_merit_badges.name)
    }

    return {
      eagleRequired: eagle.sort(sortByStatus),
      electives: elective.sort(sortByStatus),
    }
  }, [meritBadgeProgress])

  // Calculate stats for section headers
  const eagleStats = useMemo(() => {
    const earned = eagleRequired.filter(b => b.status === 'awarded' || b.status === 'approved').length
    return { earned, tracked: eagleRequired.length }
  }, [eagleRequired])

  const electiveStats = useMemo(() => {
    const earned = electives.filter(b => b.status === 'awarded' || b.status === 'approved').length
    const inProgress = electives.filter(b => b.status === 'in_progress' || b.status === 'completed').length
    return { earned, inProgress, tracked: electives.length }
  }, [electives])

  // Get IDs of badges already being tracked for the dialog
  const alreadyTrackingIds = useMemo(() => {
    return meritBadgeProgress.map(b => b.bsa_merit_badges.id)
  }, [meritBadgeProgress])

  return (
    <div className="space-y-4">
      {/* Start Badge Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Start Badge
          </Button>
        </div>
      )}

      {/* Eagle Required Section */}
      <section>
        <button
          onClick={() => setEagleExpanded(!eagleExpanded)}
          className="mb-2 flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
        >
          <div className="flex items-center gap-2">
            {eagleExpanded ? (
              <ChevronDown className="h-4 w-4 text-stone-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-stone-500" />
            )}
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="font-semibold text-stone-900">Eagle Required</span>
            <span className="text-sm text-stone-500">
              ({eagleStats.earned} earned{eagleStats.tracked > 0 && `, ${eagleStats.tracked} tracked`})
            </span>
          </div>
        </button>

        {eagleExpanded && (
          <div className={cn(
            'relative overflow-hidden rounded-xl',
            // Sash styling - dark forest green with subtle gradient
            'bg-gradient-to-br from-[#1e3a12] via-[#234216] to-[#1a3210]',
            'shadow-inner'
          )}>
            {/* Fabric texture overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50" />

            <div className="relative p-4">
              {eagleRequired.length > 0 ? (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9">
                  {eagleRequired.map(badge => (
                    <SashBadgeSlot
                      key={badge.id}
                      badge={badge}
                      onClick={() => onBadgeClick(badge)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Medal className="mx-auto h-8 w-8 text-white/30" />
                  <p className="mt-2 text-sm text-white/50">No Eagle-required badges tracked yet</p>
                  {canEdit && (
                    <p className="mt-1 text-xs text-white/40">
                      Use the &quot;Start Badge&quot; button above to begin tracking
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Electives Section */}
      <section>
        <button
          onClick={() => setElectivesExpanded(!electivesExpanded)}
          className="mb-2 flex w-full items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
        >
          <div className="flex items-center gap-2">
            {electivesExpanded ? (
              <ChevronDown className="h-4 w-4 text-stone-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-stone-500" />
            )}
            <Medal className="h-4 w-4 text-forest-600" />
            <span className="font-semibold text-stone-900">Electives</span>
            <span className="text-sm text-stone-500">
              ({electiveStats.earned} earned{electiveStats.inProgress > 0 && `, ${electiveStats.inProgress} in progress`})
            </span>
          </div>
        </button>

        {electivesExpanded && (
          <div className={cn(
            'relative overflow-hidden rounded-xl',
            // Sash styling - dark forest green with subtle gradient
            'bg-gradient-to-br from-[#1e3a12] via-[#234216] to-[#1a3210]',
            'shadow-inner'
          )}>
            {/* Fabric texture overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50" />

            <div className="relative p-4">
              {electives.length > 0 ? (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9">
                  {electives.map(badge => (
                    <SashBadgeSlot
                      key={badge.id}
                      badge={badge}
                      onClick={() => onBadgeClick(badge)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <Medal className="mx-auto h-8 w-8 text-white/30" />
                  <p className="mt-2 text-sm text-white/50">No elective badges tracked yet</p>
                  {canEdit && (
                    <p className="mt-1 text-xs text-white/40">
                      Use the &quot;Start Badge&quot; button above to begin tracking
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Start Badge Search Dialog */}
      <StartBadgeSearchDialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
        scoutId={scoutId}
        unitId={unitId}
        alreadyTrackingIds={alreadyTrackingIds}
      />
    </div>
  )
}
