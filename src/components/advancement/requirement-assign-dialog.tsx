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
import { assignRequirementToScouts } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

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
  version_id: string
  rank_id: string
  requirement_number: string
  parent_requirement_id: string | null
  sub_requirement_letter: string | null
  description: string
  is_alternative: boolean | null
  alternatives_group: string | null
  display_order: number
}

interface RequirementProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
}

interface RequirementAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requirement: Requirement
  rank: Rank
  scouts: Scout[]
  unitId: string
  versionId: string
}

type ScoutStatus = 'completed' | 'in_progress' | 'not_started'

interface ScoutWithStatus {
  scout: Scout
  status: ScoutStatus
  rankProgressId: string | null
  requirementProgressId: string | null
}

export function RequirementAssignDialog({
  open,
  onOpenChange,
  requirement,
  rank,
  scouts,
  unitId,
  versionId,
}: RequirementAssignDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Categorize scouts by their status for this requirement
  const scoutsWithStatus: ScoutWithStatus[] = scouts.map((scout) => {
    const rankProgress = scout.scout_rank_progress.find((rp) => rp.rank_id === rank.id)

    if (!rankProgress) {
      return {
        scout,
        status: 'not_started' as ScoutStatus,
        rankProgressId: null,
        requirementProgressId: null,
      }
    }

    const reqProgress = rankProgress.scout_rank_requirement_progress.find(
      (rp) => rp.requirement_id === requirement.id
    )

    if (reqProgress && ['completed', 'approved', 'awarded'].includes(reqProgress.status)) {
      return {
        scout,
        status: 'completed' as ScoutStatus,
        rankProgressId: rankProgress.id,
        requirementProgressId: reqProgress.id,
      }
    }

    return {
      scout,
      status: 'in_progress' as ScoutStatus,
      rankProgressId: rankProgress.id,
      requirementProgressId: reqProgress?.id || null,
    }
  })

  // Sort: in_progress first, then not_started, then completed
  const sortedScouts = [...scoutsWithStatus].sort((a, b) => {
    const order = { in_progress: 0, not_started: 1, completed: 2 }
    return order[a.status] - order[b.status]
  })

  const inProgressScouts = sortedScouts.filter((s) => s.status === 'in_progress')
  const notStartedScouts = sortedScouts.filter((s) => s.status === 'not_started')
  const completedScouts = sortedScouts.filter((s) => s.status === 'completed')

  const toggleScout = (scoutId: string) => {
    const newSelected = new Set(selectedScoutIds)
    if (newSelected.has(scoutId)) {
      newSelected.delete(scoutId)
    } else {
      newSelected.add(scoutId)
    }
    setSelectedScoutIds(newSelected)
  }

  const selectAllInProgress = () => {
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

    startTransition(async () => {
      const result = await assignRequirementToScouts({
        requirementId: requirement.id,
        rankId: rank.id,
        versionId,
        unitId,
        scoutIds: Array.from(selectedScoutIds),
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
            Mark this requirement as complete for selected scouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Requirement Info */}
          <div className="rounded-lg bg-stone-50 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{rank.name}</Badge>
              <span className="font-mono text-sm font-medium">Req {requirementLabel}</span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{requirement.description}</p>
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
              {inProgressScouts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllInProgress}
                  className="h-7 text-xs"
                >
                  Select all in progress ({inProgressScouts.length})
                </Button>
              )}
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {/* In Progress */}
              {inProgressScouts.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-stone-500">
                    Working on {rank.name} ({inProgressScouts.length})
                  </p>
                  {inProgressScouts.map(({ scout }) => (
                    <ScoutCheckboxRow
                      key={scout.id}
                      scout={scout}
                      status="in_progress"
                      checked={selectedScoutIds.has(scout.id)}
                      onToggle={() => toggleScout(scout.id)}
                    />
                  ))}
                </div>
              )}

              {/* Not Started */}
              {notStartedScouts.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-stone-500">
                    Not started ({notStartedScouts.length})
                  </p>
                  {notStartedScouts.map(({ scout }) => (
                    <ScoutCheckboxRow
                      key={scout.id}
                      scout={scout}
                      status="not_started"
                      checked={selectedScoutIds.has(scout.id)}
                      onToggle={() => toggleScout(scout.id)}
                    />
                  ))}
                </div>
              )}

              {/* Completed */}
              {completedScouts.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-stone-500">
                    Already completed ({completedScouts.length})
                  </p>
                  {completedScouts.map(({ scout }) => (
                    <ScoutCheckboxRow
                      key={scout.id}
                      scout={scout}
                      status="completed"
                      checked={false}
                      onToggle={() => {}}
                      disabled
                    />
                  ))}
                </div>
              )}

              {sortedScouts.length === 0 && (
                <p className="py-4 text-center text-sm text-stone-500">No scouts found</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Completed at troop meeting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
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

interface ScoutCheckboxRowProps {
  scout: Scout
  status: ScoutStatus
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}

function ScoutCheckboxRow({ scout, status, checked, onToggle, disabled }: ScoutCheckboxRowProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : checked
          ? 'bg-forest-50'
          : 'hover:bg-stone-50'
      }`}
    >
      {status === 'completed' ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      )}
      <span className="flex-1 text-sm">
        {scout.first_name} {scout.last_name}
      </span>
      {status === 'in_progress' && (
        <Badge variant="outline" className="text-xs">
          In Progress
        </Badge>
      )}
      {status === 'not_started' && (
        <span className="text-xs text-stone-400">
          {scout.rank || 'No rank'}
        </span>
      )}
      {status === 'completed' && (
        <Badge variant="secondary" className="text-xs">
          Done
        </Badge>
      )}
    </label>
  )
}
