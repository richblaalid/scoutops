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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { MeritBadgeIcon } from './merit-badge-icon'
import { startMeritBadge } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'
import { Loader2, Star } from 'lucide-react'
import type { BsaMeritBadge } from '@/types/advancement'

type MeritBadge = BsaMeritBadge

interface Scout {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
  scout_merit_badge_progress: Array<{
    merit_badge_id: string
  }>
}

interface StartMeritBadgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  badge: MeritBadge
  scoutsNotStarted: Scout[]
  unitId: string
  versionId: string
}

export function StartMeritBadgeDialog({
  open,
  onOpenChange,
  badge,
  scoutsNotStarted,
  unitId,
  versionId,
}: StartMeritBadgeDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
  const [counselorName, setCounselorName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)

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
    const newSelected = new Set<string>()
    scoutsNotStarted.forEach((s) => newSelected.add(s.id))
    setSelectedScoutIds(newSelected)
  }

  const handleSubmit = () => {
    if (selectedScoutIds.size === 0) {
      setError('Please select at least one scout')
      return
    }

    setError(null)
    setSuccessCount(0)

    startTransition(async () => {
      let successes = 0
      let lastError = ''

      for (const scoutId of selectedScoutIds) {
        const result = await startMeritBadge(
          scoutId,
          badge.id,
          unitId,
          counselorName || undefined
        )

        if (result.success) {
          successes++
        } else {
          lastError = result.error || 'Failed to start badge'
        }
      }

      if (successes === selectedScoutIds.size) {
        onOpenChange(false)
        setSelectedScoutIds(new Set())
        setCounselorName('')
        router.refresh()
      } else if (successes > 0) {
        setSuccessCount(successes)
        setError(`Started for ${successes} scouts, but failed for ${selectedScoutIds.size - successes}`)
        router.refresh()
      } else {
        setError(lastError)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start Merit Badge</DialogTitle>
          <DialogDescription>
            Begin tracking {badge.name} merit badge for selected scouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Badge Info */}
          <div className="flex items-center gap-4 rounded-lg bg-stone-50 p-4">
            <MeritBadgeIcon badge={badge} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900">{badge.name}</h3>
                {badge.is_eagle_required && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                    Eagle
                  </Badge>
                )}
              </div>
              <p className="text-sm text-stone-500">{badge.category || 'General'}</p>
            </div>
          </div>

          {/* Counselor Name */}
          <div className="space-y-2">
            <Label htmlFor="counselorName">Merit Badge Counselor (optional)</Label>
            <Input
              id="counselorName"
              placeholder="Counselor name"
              value={counselorName}
              onChange={(e) => setCounselorName(e.target.value)}
            />
            <p className="text-xs text-stone-500">
              Enter the counselor&apos;s name if known
            </p>
          </div>

          {/* Scout Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Scouts to Start</Label>
              {scoutsNotStarted.length > 1 && (
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Select all ({scoutsNotStarted.length})
                </Button>
              )}
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {scoutsNotStarted.map((scout) => (
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

              {scoutsNotStarted.length === 0 && (
                <p className="py-4 text-center text-sm text-stone-500">
                  All scouts are already tracking this badge
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {successCount > 0 && (
            <p className="text-sm text-green-600">
              Successfully started for {successCount} scout{successCount !== 1 ? 's' : ''}
            </p>
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
                Starting...
              </>
            ) : (
              `Start for ${selectedScoutIds.size} Scout${selectedScoutIds.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
