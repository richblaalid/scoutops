'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { assignMeritBadgeRequirementToScouts } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
}

interface Requirement {
  id: string
  version_id: string
  merit_badge_id: string
  requirement_number: string
  sub_requirement_letter: string | null
  description: string
  display_order: number
}

interface RequirementProgress {
  id: string
  requirement_id: string
  status: string
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

interface BadgeRequirementAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requirement: Requirement
  badge: MeritBadge
  scoutsTracking: Scout[]
  unitId: string
  versionId: string
}

type ScoutStatus = 'completed' | 'in_progress'

interface ScoutWithStatus {
  scout: Scout
  status: ScoutStatus
  badgeProgressId: string
  requirementProgressId: string | null
}

export function BadgeRequirementAssignDialog({
  open,
  onOpenChange,
  requirement,
  badge,
  scoutsTracking,
  unitId,
  versionId,
}: BadgeRequirementAssignDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Categorize scouts by their status for this requirement
  const scoutsWithStatus: ScoutWithStatus[] = scoutsTracking.map((scout) => {
    const badgeProgress = scout.scout_merit_badge_progress.find(
      (p) => p.merit_badge_id === badge.id
    )!

    const reqProgress = badgeProgress.scout_merit_badge_requirement_progress.find(
      (rp) => rp.requirement_id === requirement.id
    )

    if (reqProgress && ['completed', 'approved'].includes(reqProgress.status)) {
      return {
        scout,
        status: 'completed' as ScoutStatus,
        badgeProgressId: badgeProgress.id,
        requirementProgressId: reqProgress.id,
      }
    }

    return {
      scout,
      status: 'in_progress' as ScoutStatus,
      badgeProgressId: badgeProgress.id,
      requirementProgressId: reqProgress?.id || null,
    }
  })

  const inProgressScouts = scoutsWithStatus.filter((s) => s.status === 'in_progress')
  const completedScouts = scoutsWithStatus.filter((s) => s.status === 'completed')

  const toggleScout = (scoutId: string) => {
    const newSelected = new Set(selectedScoutIds)
    if (newSelected.has(scoutId)) {
      newSelected.delete(scoutId)
    } else {
      newSelected.add(scoutId)
    }
    setSelectedScoutIds(newSelected)
  }

  const selectAll = () => {
    const newSelected = new Set(selectedScoutIds)
    inProgressScouts.forEach((s) => newSelected.add(s.scout.id))
    setSelectedScoutIds(newSelected)
  }

  const handleSubmit = () => {
    if (selectedScoutIds.size === 0) {
      setError('Please select at least one scout')
      return
    }

    setError(null)

    // Get the badge progress IDs for selected scouts
    const assignments = inProgressScouts
      .filter((s) => selectedScoutIds.has(s.scout.id))
      .map((s) => ({
        scoutId: s.scout.id,
        badgeProgressId: s.badgeProgressId,
        requirementProgressId: s.requirementProgressId,
      }))

    startTransition(async () => {
      const result = await assignMeritBadgeRequirementToScouts({
        requirementId: requirement.id,
        meritBadgeId: badge.id,
        versionId,
        unitId,
        assignments,
        completedAt,
        notes: notes || undefined,
      })

      if (result.success) {
        onOpenChange(false)
        setSelectedScoutIds(new Set())
        setNotes('')
        router.refresh()
      } else {
        setError(result.error || 'Failed to assign requirement')
      }
    })
  }

  const requirementLabel = requirement.sub_requirement_letter
    ? `${requirement.requirement_number}${requirement.sub_requirement_letter}`
    : requirement.requirement_number

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Requirement Completion</DialogTitle>
          <DialogDescription>
            Mark this requirement as complete for scouts tracking {badge.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Requirement Info */}
          <div className="rounded-lg bg-stone-50 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{badge.name}</Badge>
              <span className="font-mono text-sm font-medium">Req {requirementLabel}</span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-stone-600">
              {requirement.description}
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="completedAt">Date Completed</Label>
            <Input
              id="completedAt"
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
            />
          </div>

          {/* Scout Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Scouts</Label>
              {inProgressScouts.length > 1 && (
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Select all ({inProgressScouts.length})
                </Button>
              )}
            </div>

            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
              {inProgressScouts.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-stone-500">
                    Tracking ({inProgressScouts.length})
                  </p>
                  {inProgressScouts.map(({ scout }) => (
                    <label
                      key={scout.id}
                      className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
                        selectedScoutIds.has(scout.id)
                          ? 'bg-forest-50'
                          : 'hover:bg-stone-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedScoutIds.has(scout.id)}
                        onCheckedChange={() => toggleScout(scout.id)}
                      />
                      <span className="flex-1 text-sm">
                        {scout.first_name} {scout.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {completedScouts.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-stone-500">
                    Already completed ({completedScouts.length})
                  </p>
                  {completedScouts.map(({ scout }) => (
                    <div
                      key={scout.id}
                      className="flex cursor-not-allowed items-center gap-2 rounded p-2 opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="flex-1 text-sm">
                        {scout.first_name} {scout.last_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Done
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {scoutsTracking.length === 0 && (
                <p className="py-4 text-center text-sm text-stone-500">
                  No scouts are tracking this badge yet
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Completed during troop meeting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedScoutIds.size === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedScoutIds.size} Scout${selectedScoutIds.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
