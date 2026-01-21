'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { MeritBadgeIcon } from './merit-badge-icon'
import { BadgeRequirementAssignDialog } from './badge-requirement-assign-dialog'
import { StartMeritBadgeDialog } from './start-merit-badge-dialog'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Star,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react'

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
  pamphlet_url: string | null
}

interface Requirement {
  id: string
  version_id: string
  merit_badge_id: string
  requirement_number: string
  parent_requirement_id: string | null
  sub_requirement_letter: string | null
  description: string
  display_order: number
}

interface RequirementProgress {
  id: string
  requirement_id: string
  status: string
  completed_at?: string | null
  completed_by?: string | null
  notes?: string | null
}

interface BadgeProgress {
  id: string
  merit_badge_id: string
  status: string
  counselor_name: string | null
  started_at: string | null
  completed_at: string | null
  awarded_at: string | null
  scout_merit_badge_requirement_progress: RequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
  scout_merit_badge_progress: BadgeProgress[]
}

interface MeritBadgeDetailViewProps {
  badge: MeritBadge
  requirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
  canEdit: boolean
  isLoading?: boolean
  onBack: () => void
  currentUserName?: string
}

// Parse requirement number to extract group number
function parseRequirementNumber(reqNum: string): { group: number; subLetter: string | null } {
  const match = reqNum.match(/^(\d+)([a-z])?$/i)
  if (!match) {
    return { group: 0, subLetter: null }
  }
  return {
    group: parseInt(match[1], 10),
    subLetter: match[2]?.toLowerCase() || null,
  }
}

export function MeritBadgeDetailView({
  badge,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
  isLoading = false,
  onBack,
}: MeritBadgeDetailViewProps) {
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())

  // Get scouts tracking this badge
  const scoutsTracking = useMemo(() => scouts.filter((scout) =>
    scout.scout_merit_badge_progress.some(
      (p) => p.merit_badge_id === badge.id && ['in_progress', 'completed'].includes(p.status)
    )
  ), [scouts, badge.id])

  // Get scouts who have earned this badge
  const scoutsEarned = useMemo(() => scouts.filter((scout) =>
    scout.scout_merit_badge_progress.some(
      (p) => p.merit_badge_id === badge.id && p.status === 'awarded'
    )
  ), [scouts, badge.id])

  // Get scouts who haven't started this badge
  const scoutsNotStarted = useMemo(() => scouts.filter(
    (scout) =>
      !scout.scout_merit_badge_progress.some((p) => p.merit_badge_id === badge.id)
  ), [scouts, badge.id])

  // Sort requirements
  const sortedRequirements = useMemo(() =>
    [...requirements].sort((a, b) => a.display_order - b.display_order),
    [requirements]
  )

  // Group requirements by main number
  const groupedRequirements = useMemo(() => {
    const groups = new Map<number, { main: Requirement | null; children: Requirement[] }>()

    sortedRequirements.forEach((req) => {
      const parsed = parseRequirementNumber(req.requirement_number)

      if (!groups.has(parsed.group)) {
        groups.set(parsed.group, { main: null, children: [] })
      }

      const group = groups.get(parsed.group)!

      if (req.sub_requirement_letter) {
        group.children.push(req)
      } else {
        group.main = req
      }
    })

    // Sort children within each group
    groups.forEach((group) => {
      group.children.sort((a, b) =>
        (a.sub_requirement_letter || '').localeCompare(b.sub_requirement_letter || '')
      )
    })

    return groups
  }, [sortedRequirements])

  // Get completion stats for a requirement across all tracking scouts
  const getRequirementStats = (requirementId: string) => {
    let completed = 0
    scoutsTracking.forEach((scout) => {
      const badgeProgress = scout.scout_merit_badge_progress.find(
        (p) => p.merit_badge_id === badge.id
      )
      if (badgeProgress) {
        const reqProgress = badgeProgress.scout_merit_badge_requirement_progress.find(
          (rp) => rp.requirement_id === requirementId
        )
        if (reqProgress && ['completed', 'approved'].includes(reqProgress.status)) {
          completed++
        }
      }
    })
    return { completed, total: scoutsTracking.length }
  }

  // Get group completion stats
  const getGroupStats = (groupNum: number) => {
    const group = groupedRequirements.get(groupNum)
    if (!group) return { completed: 0, total: 0, allDone: false }

    // If there are children, count those. Otherwise count the main requirement.
    const reqs = group.children.length > 0 ? group.children : (group.main ? [group.main] : [])

    let allCompleted = true
    reqs.forEach((req) => {
      const stats = getRequirementStats(req.id)
      if (stats.completed < stats.total) {
        allCompleted = false
      }
    })

    return {
      allDone: allCompleted && scoutsTracking.length > 0,
      reqCount: reqs.length
    }
  }

  const toggleGroup = (groupNum: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupNum)) {
        next.delete(groupNum)
      } else {
        next.add(groupNum)
      }
      return next
    })
  }

  const handleAssignClick = (requirement: Requirement) => {
    setSelectedRequirement(requirement)
    setIsAssignDialogOpen(true)
  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header with badge info */}
        <CardHeader className="pb-4 bg-gradient-to-r from-forest-50/80 to-emerald-50/50">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-2 h-8 gap-1 text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Badges
          </Button>

          <div className="flex items-start gap-4">
            {/* Badge Icon */}
            <div className="relative shrink-0">
              <MeritBadgeIcon
                badge={{
                  id: badge.id,
                  code: badge.code,
                  name: badge.name,
                  category: badge.category,
                  description: badge.description,
                  is_eagle_required: badge.is_eagle_required,
                  is_active: badge.is_active,
                  image_url: badge.image_url,
                }}
                size="xl"
              />
            </div>

            {/* Badge Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900">{badge.name}</h2>
                {badge.is_eagle_required && (
                  <Badge className="bg-amber-100 text-amber-800 border-0">
                    <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                    Eagle Required
                  </Badge>
                )}
              </div>

              {/* Badge metadata */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
                {badge.category && (
                  <Badge variant="outline" className="text-xs">
                    {badge.category}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {badge.description && (
                <p className="mt-2 text-sm text-stone-600 line-clamp-2">{badge.description}</p>
              )}

              {/* Pamphlet Link */}
              {badge.pamphlet_url && (
                <a
                  href={badge.pamphlet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-pine-200 bg-pine-50 px-3 py-1.5 text-xs font-medium text-pine-700 transition-colors hover:bg-pine-100"
                >
                  <FileText className="h-3 w-3" />
                  Merit Badge Pamphlet
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xl font-bold text-blue-900">
                  {scoutsTracking.length}
                </span>
              </div>
              <p className="text-xs text-blue-600">In Progress</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xl font-bold text-green-900">
                  {scoutsEarned.length}
                </span>
              </div>
              <p className="text-xs text-green-600">Earned</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-stone-600" />
                <span className="text-xl font-bold text-stone-900">
                  {groupedRequirements.size}
                </span>
              </div>
              <p className="text-xs text-stone-600">Requirements</p>
            </div>
          </div>

          {/* Scouts Tracking Summary */}
          {scoutsTracking.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-stone-900">
                Scouts Tracking ({scoutsTracking.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {scoutsTracking.map((scout) => {
                  const progress = scout.scout_merit_badge_progress.find(
                    (p) => p.merit_badge_id === badge.id
                  )
                  const mainReqs = sortedRequirements.filter((r) => !r.sub_requirement_letter)
                  const mainReqIds = new Set(mainReqs.map((r) => r.id))
                  const reqsCompleted =
                    progress?.scout_merit_badge_requirement_progress.filter(
                      (rp) =>
                        ['completed', 'approved'].includes(rp.status) &&
                        mainReqIds.has(rp.requirement_id)
                    ).length || 0
                  const totalReqs = mainReqs.length

                  return (
                    <div
                      key={scout.id}
                      className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1"
                    >
                      <span className="text-sm font-medium text-stone-700">
                        {scout.first_name} {scout.last_name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {reqsCompleted}/{totalReqs}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Start Tracking Button */}
          {canEdit && scoutsNotStarted.length > 0 && (
            <div className="mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStartDialogOpen(true)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Start Tracking for Scout
              </Button>
            </div>
          )}

          {/* Requirements Section */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-stone-900">Requirements</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
                <span className="ml-2 text-stone-500">Loading requirements...</span>
              </div>
            ) : groupedRequirements.size > 0 ? (
              <div className="space-y-2">
                {Array.from(groupedRequirements.entries()).map(([groupNum, { main, children }]) => {
                  const isCollapsed = collapsedGroups.has(groupNum)
                  const groupStats = getGroupStats(groupNum)
                  const hasChildren = children.length > 0

                  return (
                    <div
                      key={groupNum}
                      className={cn(
                        'rounded-lg border transition-colors',
                        groupStats.allDone
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-stone-200 bg-stone-50/30'
                      )}
                    >
                      {/* Collapsible Header */}
                      <button
                        onClick={() => toggleGroup(groupNum)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                          'hover:bg-stone-100/50',
                          isCollapsed ? 'rounded-lg' : 'rounded-t-lg',
                          groupStats.allDone && 'hover:bg-emerald-100/50'
                        )}
                      >
                        {/* Expand/Collapse Icon */}
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-stone-400">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>

                        {/* Requirement Number Badge */}
                        <span className={cn(
                          'flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded px-1.5 text-xs font-bold',
                          groupStats.allDone
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        )}>
                          {groupNum}
                        </span>

                        {/* Title */}
                        <span className={cn(
                          'flex-1 font-medium',
                          groupStats.allDone ? 'text-emerald-700' : 'text-stone-700'
                        )}>
                          Requirement {groupNum}
                        </span>

                        {/* Status Indicator */}
                        {groupStats.allDone ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                            Complete
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">
                            {hasChildren ? `${children.length} sub-reqs` : ''}
                          </span>
                        )}
                      </button>

                      {/* Expanded Content */}
                      {!isCollapsed && (
                        <div className="border-t border-stone-100 px-3 pb-3 pt-2">
                          {/* Main requirement description */}
                          {main && (
                            <div className="mb-2">
                              <p className="text-sm text-stone-700">{main.description}</p>
                              {!hasChildren && canEdit && scouts.length > 0 && (
                                <RequirementRow
                                  requirement={main}
                                  stats={getRequirementStats(main.id)}
                                  onAssign={() => handleAssignClick(main)}
                                  canEdit={canEdit}
                                  scoutsTracking={scoutsTracking.length}
                                />
                              )}
                            </div>
                          )}

                          {/* Sub-requirements */}
                          {hasChildren && (
                            <div className="space-y-1 mt-2">
                              {children.map((child) => {
                                const stats = getRequirementStats(child.id)
                                return (
                                  <div
                                    key={child.id}
                                    className="ml-2 border-l-2 border-stone-200 pl-3"
                                  >
                                    <div className="flex items-start justify-between gap-2 rounded-md bg-white p-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium',
                                            stats.completed === stats.total && stats.total > 0
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : 'bg-stone-100 text-stone-600'
                                          )}>
                                            {child.sub_requirement_letter}
                                          </span>
                                          {stats.total > 0 && (
                                            <span className={cn(
                                              'text-xs',
                                              stats.completed === stats.total
                                                ? 'text-emerald-600'
                                                : 'text-stone-400'
                                            )}>
                                              {stats.completed}/{stats.total} done
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 text-sm text-stone-600">
                                          {child.description}
                                        </p>
                                      </div>
                                      {canEdit && scouts.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAssignClick(child)}
                                          className="h-7 shrink-0 px-2 text-xs text-forest-600 hover:bg-forest-50 hover:text-forest-700"
                                        >
                                          <Check className="mr-1 h-3 w-3" />
                                          Sign Off
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center rounded-lg border border-dashed border-stone-300 bg-stone-50">
                <p className="text-sm text-stone-500">No requirements found for this badge</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign Off Requirement Dialog */}
      {selectedRequirement && (
        <BadgeRequirementAssignDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          requirement={selectedRequirement}
          badge={badge}
          allScouts={scouts}
          unitId={unitId}
          versionId={versionId}
        />
      )}

      {/* Start Tracking Dialog */}
      <StartMeritBadgeDialog
        open={isStartDialogOpen}
        onOpenChange={setIsStartDialogOpen}
        badge={badge}
        scoutsNotStarted={scoutsNotStarted}
        unitId={unitId}
        versionId={versionId}
      />
    </>
  )
}

// Simple row component for main requirements without sub-items
function RequirementRow({
  requirement,
  stats,
  onAssign,
  canEdit,
  scoutsTracking,
}: {
  requirement: Requirement
  stats: { completed: number; total: number }
  onAssign: () => void
  canEdit: boolean
  scoutsTracking: number
}) {
  return (
    <div className="mt-2 flex items-center justify-between">
      {stats.total > 0 && (
        <span className={cn(
          'text-xs',
          stats.completed === stats.total
            ? 'text-emerald-600'
            : 'text-stone-400'
        )}>
          {stats.completed}/{stats.total} scouts done
        </span>
      )}
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAssign}
          className="h-7 px-2 text-xs text-forest-600 hover:bg-forest-50 hover:text-forest-700"
        >
          <Check className="mr-1 h-3 w-3" />
          Sign Off
        </Button>
      )}
    </div>
  )
}
