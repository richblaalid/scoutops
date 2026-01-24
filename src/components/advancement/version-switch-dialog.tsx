'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react'
import {
  RequirementComparisonPanel,
  type RequirementMapping,
} from './requirement-comparison-panel'
import { switchMeritBadgeVersion } from '@/app/actions/advancement'

interface RequirementProgress {
  id: string
  status: string
  completed_at: string | null
  requirement_id?: string
  bsa_merit_badge_requirements?: {
    id: string
    requirement_number: string
    description: string
  }
}

interface VersionSwitchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meritBadgeId: string
  meritBadgeName: string
  progressId: string
  scoutId: string
  unitId: string
  currentVersionYear: number
  targetVersionYear: number
  currentProgress: RequirementProgress[]
  onComplete: () => void
}

/**
 * Dialog for switching a scout's merit badge requirements to a different version.
 * Shows comparison between current and target versions, allowing leader to confirm mapping.
 */
export function VersionSwitchDialog({
  open,
  onOpenChange,
  meritBadgeId,
  meritBadgeName,
  progressId,
  scoutId,
  unitId,
  currentVersionYear,
  targetVersionYear,
  currentProgress,
  onComplete,
}: VersionSwitchDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mappings, setMappings] = useState<RequirementMapping[]>([])
  const [result, setResult] = useState<{ mappedCount: number; unmappedCount: number } | null>(null)

  // Count completed requirements
  const completedCount = currentProgress.filter(p => p.status === 'completed').length
  const hasProgress = completedCount > 0

  // Convert current progress to the format expected by comparison panel
  const completedRequirements = currentProgress
    .filter(p => p.bsa_merit_badge_requirements)
    .map(p => ({
      requirement_id: p.requirement_id || p.bsa_merit_badge_requirements?.id,
      requirement_number: p.bsa_merit_badge_requirements?.requirement_number,
      status: p.status,
    }))

  const handleMappingChange = useCallback((newMappings: RequirementMapping[]) => {
    setMappings(newMappings)
  }, [])

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      try {
        const response = await switchMeritBadgeVersion({
          unitId,
          scoutId,
          meritBadgeId,
          progressId,
          currentVersionYear,
          targetVersionYear,
          mappings: mappings.map(m => ({
            sourceReqNumber: m.sourceReqNumber,
            targetReqId: m.targetReqId,
            targetReqNumber: m.targetReqNumber,
            confidence: m.confidence,
          })),
        })

        if (!response.success) {
          setError(response.error || 'Failed to switch version')
          return
        }

        setResult(response.data || null)

        // Auto-close after short delay to show success
        setTimeout(() => {
          onComplete()
        }, 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch version')
      }
    })
  }

  // Calculate mapping summary
  const exactMatches = mappings.filter(m => m.confidence === 'exact').length
  const likelyMatches = mappings.filter(m => m.confidence === 'likely').length
  const noMatches = mappings.filter(m => m.confidence === 'none').length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Switch Requirement Version</DialogTitle>
          <DialogDescription>
            Change {meritBadgeName} requirements from {currentVersionYear} to {targetVersionYear}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Success State */}
          {result && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-stone-900">Version Switched Successfully</h3>
              <p className="mt-2 text-sm text-stone-600 text-center">
                {result.mappedCount} requirement{result.mappedCount !== 1 ? 's' : ''} mapped to {targetVersionYear} version
                {result.unmappedCount > 0 && (
                  <>
                    <br />
                    <span className="text-amber-600">
                      {result.unmappedCount} requirement{result.unmappedCount !== 1 ? 's' : ''} could not be mapped
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Version Change Summary */}
          {!result && (
            <div className="flex items-center justify-center gap-4 rounded-lg bg-stone-50 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-700">{currentVersionYear}</div>
                <div className="text-xs text-stone-500">Current</div>
              </div>
              <ArrowRight className="h-5 w-5 text-stone-400" />
              <div className="text-center">
                <div className="text-2xl font-bold text-forest-600">{targetVersionYear}</div>
                <div className="text-xs text-stone-500">Target</div>
              </div>
            </div>
          )}

          {/* Warning about progress */}
          {!result && hasProgress && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  This scout has {completedCount} completed requirement{completedCount !== 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-amber-700">
                  Review the mappings below. Requirements that cannot be matched will need to be re-completed.
                </p>
              </div>
            </div>
          )}

          {/* Requirement Comparison Panel */}
          {!result && hasProgress && (
            <div className="rounded-lg border border-stone-200 p-4">
              <h3 className="text-sm font-medium text-stone-800 mb-3">
                Requirement Mappings
              </h3>
              <RequirementComparisonPanel
                meritBadgeId={meritBadgeId}
                currentVersionYear={currentVersionYear}
                targetVersionYear={targetVersionYear}
                completedRequirements={completedRequirements}
                onMappingChange={handleMappingChange}
              />
            </div>
          )}

          {/* No progress case */}
          {!result && !hasProgress && (
            <p className="text-sm text-stone-600">
              No requirements have been completed yet. Switching versions will simply update
              which requirements are shown.
            </p>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {!result && (
          <DialogFooter className="border-t pt-4">
            <div className="flex w-full items-center justify-between">
              {/* Mapping summary */}
              {hasProgress && mappings.length > 0 && (
                <div className="text-xs text-stone-500">
                  {exactMatches + likelyMatches} of {mappings.length} requirements will be mapped
                  {noMatches > 0 && (
                    <span className="text-amber-600"> ({noMatches} unmatched)</span>
                  )}
                </div>
              )}
              {(!hasProgress || mappings.length === 0) && <div />}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    'Switch Version'
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
