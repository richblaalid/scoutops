'use client'

import { useMemo, useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MeritBadgeIcon } from './merit-badge-icon'
import { HierarchicalRequirementsList } from './hierarchical-requirements-list'
import { MultiSelectActionBar } from './multi-select-action-bar'
import { BulkApprovalSheet } from './bulk-approval-sheet'
import { cn } from '@/lib/utils'
import { ArrowLeft, Award, Calendar, Check, Star, User, Loader2, ListChecks } from 'lucide-react'
import { getMeritBadgeRequirements, markMeritBadgeRequirement } from '@/app/actions/advancement'
import type { AdvancementStatus } from '@/types/advancement'

interface MeritBadgeProgress {
  id: string
  status: string
  version_id?: string
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
    completed_by?: string | null
    notes?: string | null
    requirement_id?: string
    bsa_merit_badge_requirements?: {
      id: string
      requirement_number: string
      description: string
      parent_requirement_id?: string | null
    }
  }>
}

interface SingleMeritBadgeRequirementsProps {
  badge: MeritBadgeProgress
  scoutId: string
  unitId: string
  versionId: string
  canEdit: boolean
  onBack: () => void
  currentUserName?: string
}

export function SingleMeritBadgeRequirements({
  badge,
  scoutId,
  unitId,
  versionId,
  canEdit,
  onBack,
  currentUserName = 'Leader',
}: SingleMeritBadgeRequirementsProps) {
  const [requirements, setRequirements] = useState<Array<{
    id: string
    requirement_number: string
    description: string
    parent_requirement_id: string | null
  }>>([])
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Multi-select mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApprovalOpen, setBulkApprovalOpen] = useState(false)

  // Fetch requirements on mount
  useEffect(() => {
    setIsLoadingRequirements(true)
    startTransition(async () => {
      try {
        const reqs = await getMeritBadgeRequirements(badge.bsa_merit_badges.id, versionId)
        setRequirements(reqs as Array<{
          id: string
          requirement_number: string
          description: string
          parent_requirement_id: string | null
        }>)
      } catch (error) {
        console.error('Error fetching requirements:', error)
      } finally {
        setIsLoadingRequirements(false)
      }
    })
  }, [badge.bsa_merit_badges.id, versionId])

  // Build progress map for quick lookup
  const progressMap = useMemo(() => {
    const map = new Map<string, {
      id: string
      status: string
      completed_at: string | null
      completed_by: string | null
      notes: string | null
    }>()

    badge.scout_merit_badge_requirement_progress.forEach(p => {
      // Use either the direct requirement_id or nested bsa_merit_badge_requirements.id
      const reqId = p.requirement_id || p.bsa_merit_badge_requirements?.id
      if (reqId) {
        map.set(reqId, {
          id: p.id,
          status: p.status,
          completed_at: p.completed_at,
          completed_by: p.completed_by || null,
          notes: p.notes || null,
        })
      }
    })
    return map
  }, [badge.scout_merit_badge_requirement_progress])

  // Format requirements for HierarchicalRequirementsList
  const formattedRequirements = useMemo(() => {
    return requirements
      .filter(req => !req.parent_requirement_id) // Only top-level requirements
      .sort((a, b) => {
        const numA = parseFloat(a.requirement_number || '0')
        const numB = parseFloat(b.requirement_number || '0')
        return numA - numB
      })
      .map(req => {
        const progress = progressMap.get(req.id)
        return {
          id: req.id,
          requirementProgressId: progress?.id || null,
          requirementNumber: req.requirement_number,
          description: req.description,
          status: (progress?.status || 'not_started') as AdvancementStatus,
          completedAt: progress?.completed_at || null,
          completedBy: progress?.completed_by || null,
          notes: progress?.notes || null,
          approvalStatus: null,
        }
      })
  }, [requirements, progressMap])

  // Calculate progress stats
  const completedCount = formattedRequirements.filter(
    r => ['completed', 'approved'].includes(r.status)
  ).length
  const totalCount = formattedRequirements.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Multi-select helpers
  const incompleteRequirements = useMemo(() => {
    return formattedRequirements.filter(
      r => !['completed', 'approved', 'awarded'].includes(r.status)
    )
  }, [formattedRequirements])

  const incompleteIds = useMemo(() => {
    return new Set(incompleteRequirements.map(r => r.id))
  }, [incompleteRequirements])

  const handleSelectionChange = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedIds(new Set(incompleteIds))
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleCancelMultiSelect = () => {
    setIsMultiSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleSignOff = () => {
    setBulkApprovalOpen(true)
  }

  const handleBulkApprovalComplete = () => {
    setBulkApprovalOpen(false)
    setIsMultiSelectMode(false)
    setSelectedIds(new Set())
  }

  const isAwarded = badge.status === 'awarded' || badge.status === 'approved'
  const isInProgress = badge.status === 'in_progress' || badge.status === 'completed'

  const statusConfig: Record<string, { bg: string; text: string; label: string; icon?: boolean }> = {
    not_started: { bg: 'bg-stone-100', text: 'text-stone-600', label: 'Not Started' },
    in_progress: { bg: 'bg-forest-100', text: 'text-forest-700', label: 'In Progress' },
    completed: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Completed' },
    approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
    awarded: { bg: 'bg-gradient-to-r from-amber-100 to-yellow-100', text: 'text-amber-800', label: 'Awarded', icon: true },
  }

  const config = statusConfig[badge.status] || statusConfig.not_started

  // Init data for marking requirements on not-yet-started progress
  const initData = {
    scoutId,
    meritBadgeId: badge.bsa_merit_badges.id,
    meritBadgeProgressId: badge.id,
    versionId,
  }

  return (
    <Card className={cn(
      'overflow-hidden',
      isAwarded && 'border-amber-200',
      isInProgress && 'border-forest-200'
    )}>
      {/* Header with badge info */}
      <CardHeader className={cn(
        'pb-4',
        isAwarded && 'bg-gradient-to-r from-amber-50/80 to-yellow-50/50',
        isInProgress && 'bg-gradient-to-r from-forest-50/80 to-emerald-50/50'
      )}>
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
                id: badge.bsa_merit_badges.id,
                code: badge.bsa_merit_badges.code || '',
                name: badge.bsa_merit_badges.name,
                category: badge.bsa_merit_badges.category,
                description: null,
                is_eagle_required: badge.bsa_merit_badges.is_eagle_required,
                is_active: true,
                image_url: badge.bsa_merit_badges.image_url ?? null,
              }}
              size="xl"
            />
            {isAwarded && (
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-amber-500 shadow-sm">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Badge Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900">{badge.bsa_merit_badges.name}</h2>
              <Badge className={cn(config.bg, config.text, 'border-0')}>
                {config.icon && <Award className="mr-1 h-3 w-3" />}
                {config.label}
              </Badge>
            </div>

            {/* Badge metadata */}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                {badge.bsa_merit_badges.is_eagle_required && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3 w-3 fill-amber-500" />
                    Eagle Required
                  </span>
                )}
                {badge.bsa_merit_badges.category && (
                  <span className="flex items-center gap-1">
                    <span className="text-stone-300">|</span>
                    {badge.bsa_merit_badges.category}
                  </span>
                )}
                {badge.counselor_name && (
                  <span className="flex items-center gap-1">
                    <span className="text-stone-300">|</span>
                    <User className="h-3 w-3" />
                    {badge.counselor_name}
                  </span>
                )}
              </div>

              {/* Multi-select toggle */}
              {canEdit && !isAwarded && incompleteRequirements.length > 0 && (
                <Button
                  variant={isMultiSelectMode ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (isMultiSelectMode) {
                      handleCancelMultiSelect()
                    } else {
                      setIsMultiSelectMode(true)
                    }
                  }}
                  className={cn(
                    'h-8 gap-1.5 text-xs',
                    isMultiSelectMode && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  )}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  {isMultiSelectMode ? 'Cancel Selection' : 'Select Multiple'}
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {!isAwarded && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-stone-600">
                    {completedCount} of {totalCount} requirements completed
                  </span>
                  <span className={cn(
                    'font-semibold',
                    isInProgress ? 'text-forest-600' : 'text-stone-600'
                  )}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isInProgress
                        ? 'bg-gradient-to-r from-forest-500 to-forest-400'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Award Date */}
            {isAwarded && badge.awarded_at && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                <Calendar className="h-4 w-4" />
                Awarded {new Date(badge.awarded_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading state */}
        {isLoadingRequirements ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
            <span className="ml-2 text-stone-500">Loading requirements...</span>
          </div>
        ) : formattedRequirements.length > 0 ? (
          <HierarchicalRequirementsList
            requirements={formattedRequirements}
            unitId={unitId}
            canEdit={canEdit}
            defaultCollapseCompleted={true}
            currentUserName={currentUserName}
            isMeritBadge={true}
            meritBadgeInitData={initData}
            isMultiSelectMode={isMultiSelectMode}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <div className="py-12 text-center">
            <Award className="mx-auto h-12 w-12 text-stone-300" />
            <p className="mt-2 text-stone-500">No requirements found for this badge</p>
          </div>
        )}
      </CardContent>

      {/* Multi-select action bar */}
      <MultiSelectActionBar
        selectedCount={selectedIds.size}
        totalSelectableCount={incompleteRequirements.length}
        onSelectAll={handleSelectAll}
        onClear={handleClearSelection}
        onSignOff={handleSignOff}
        onCancel={handleCancelMultiSelect}
        visible={isMultiSelectMode}
      />

      {/* Bulk Approval Sheet */}
      <BulkApprovalSheet
        type="merit-badge"
        requirements={formattedRequirements}
        itemName={badge.bsa_merit_badges.name}
        unitId={unitId}
        scoutId={scoutId}
        open={bulkApprovalOpen}
        onOpenChange={setBulkApprovalOpen}
        preSelectedIds={selectedIds}
        onComplete={handleBulkApprovalComplete}
      />
    </Card>
  )
}
