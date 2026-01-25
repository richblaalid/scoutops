'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Award, Medal, Star } from 'lucide-react'
import { bulkApproveParentSubmissions, bulkAwardMeritBadges } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PendingApproval {
  id: string
  status: string
  approval_status: string | null
  submission_notes: string | null
  submitted_at: string | null
  scout_rank_progress: {
    id: string
    scout_id: string
    scouts: { id: string; first_name: string; last_name: string } | null
    bsa_ranks: { name: string } | null
  } | null
  bsa_rank_requirements: { requirement_number: string; description: string } | null
}

interface PendingBadgeApproval {
  id: string
  status: string
  completed_at: string | null
  scout_id: string
  scouts: { id: string; first_name: string; last_name: string } | null
  bsa_merit_badges: { id: string; name: string; is_eagle_required: boolean | null } | null
}

interface PendingApprovalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingApprovals: PendingApproval[]
  pendingBadgeApprovals: PendingBadgeApproval[]
  unitId: string
}

export function PendingApprovalsModal({
  open,
  onOpenChange,
  pendingApprovals,
  pendingBadgeApprovals,
  unitId,
}: PendingApprovalsModalProps) {
  const router = useRouter()
  const [selectedRankIds, setSelectedRankIds] = useState<Set<string>>(new Set())
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<string>>(new Set())
  const [isApproving, setIsApproving] = useState(false)
  const [approvalResult, setApprovalResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedRankIds(new Set())
      setSelectedBadgeIds(new Set())
      setApprovalResult(null)
    }
  }, [open])

  const toggleRankSelection = (id: string) => {
    setSelectedRankIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleBadgeSelection = (id: string) => {
    setSelectedBadgeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllRanks = () => {
    if (selectedRankIds.size === pendingApprovals.length) {
      setSelectedRankIds(new Set())
    } else {
      setSelectedRankIds(new Set(pendingApprovals.map((a) => a.id)))
    }
  }

  const toggleAllBadges = () => {
    if (selectedBadgeIds.size === pendingBadgeApprovals.length) {
      setSelectedBadgeIds(new Set())
    } else {
      setSelectedBadgeIds(new Set(pendingBadgeApprovals.map((b) => b.id)))
    }
  }

  const handleApprove = async () => {
    const totalSelected = selectedRankIds.size + selectedBadgeIds.size
    if (totalSelected === 0) return

    setIsApproving(true)
    setApprovalResult(null)

    let totalSuccess = 0
    let totalFailed = 0
    const errors: string[] = []

    try {
      // Approve rank requirements
      if (selectedRankIds.size > 0) {
        const rankResult = await bulkApproveParentSubmissions(
          Array.from(selectedRankIds),
          unitId
        )
        if (rankResult.success && rankResult.data) {
          totalSuccess += rankResult.data.successCount
          totalFailed += rankResult.data.failedCount
        } else {
          errors.push(rankResult.error || 'Failed to approve rank requirements')
        }
      }

      // Award merit badges
      if (selectedBadgeIds.size > 0) {
        const badgeResult = await bulkAwardMeritBadges(
          Array.from(selectedBadgeIds),
          unitId
        )
        if (badgeResult.success && badgeResult.data) {
          totalSuccess += badgeResult.data.successCount
          totalFailed += badgeResult.data.failedCount
        } else {
          errors.push(badgeResult.error || 'Failed to award merit badges')
        }
      }

      if (errors.length > 0) {
        setApprovalResult({
          success: false,
          message: errors.join('. '),
        })
      } else {
        const items = totalSuccess === 1 ? 'item' : 'items'
        setApprovalResult({
          success: true,
          message: `Approved ${totalSuccess} ${items}${totalFailed > 0 ? ` (${totalFailed} failed)` : ''}`,
        })
        // Refresh the page data after a brief delay to show the success message
        setTimeout(() => {
          router.refresh()
          onOpenChange(false)
        }, 1500)
      }
    } catch {
      setApprovalResult({
        success: false,
        message: 'An unexpected error occurred',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const totalPending = pendingApprovals.length + pendingBadgeApprovals.length
  const totalSelected = selectedRankIds.size + selectedBadgeIds.size
  const allRanksSelected = selectedRankIds.size === pendingApprovals.length && pendingApprovals.length > 0
  const someRanksSelected = selectedRankIds.size > 0 && selectedRankIds.size < pendingApprovals.length
  const allBadgesSelected = selectedBadgeIds.size === pendingBadgeApprovals.length && pendingBadgeApprovals.length > 0
  const someBadgesSelected = selectedBadgeIds.size > 0 && selectedBadgeIds.size < pendingBadgeApprovals.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Pending Approvals</DialogTitle>
          <DialogDescription>
            Review and approve requirement completions and merit badges
          </DialogDescription>
        </DialogHeader>

        {totalPending === 0 ? (
          <div className="py-8 text-center text-stone-500">
            No pending approvals
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 min-h-0 max-h-[400px] pr-2">
            {/* Rank Requirements Section */}
            {pendingApprovals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    id="select-all-ranks"
                    checked={allRanksSelected}
                    onCheckedChange={toggleAllRanks}
                    className={cn(someRanksSelected && 'data-[state=checked]:bg-stone-400')}
                  />
                  <Award className="h-4 w-4 text-forest-600" />
                  <label
                    htmlFor="select-all-ranks"
                    className="text-sm font-medium text-stone-700 cursor-pointer flex-1"
                  >
                    Rank Requirements ({selectedRankIds.size}/{pendingApprovals.length})
                  </label>
                </div>

                <div className="space-y-2 pl-1">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                        selectedRankIds.has(approval.id)
                          ? 'border-forest-300 bg-forest-50/50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      )}
                    >
                      <Checkbox
                        id={approval.id}
                        checked={selectedRankIds.has(approval.id)}
                        onCheckedChange={() => toggleRankSelection(approval.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {approval.scout_rank_progress?.scouts?.id ? (
                            <Link
                              href={`/scouts/${approval.scout_rank_progress.scouts.id}`}
                              className="font-medium text-stone-900 hover:text-forest-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {approval.scout_rank_progress.scouts.first_name}{' '}
                              {approval.scout_rank_progress.scouts.last_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-stone-900">
                              {approval.scout_rank_progress?.scouts?.first_name}{' '}
                              {approval.scout_rank_progress?.scouts?.last_name}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {approval.scout_rank_progress?.bsa_ranks?.name}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-stone-600 line-clamp-2">
                          <span className="font-medium">
                            Req {approval.bsa_rank_requirements?.requirement_number}:
                          </span>{' '}
                          {approval.bsa_rank_requirements?.description}
                        </p>
                        {approval.submission_notes && (
                          <p className="mt-1 text-sm italic text-stone-500 line-clamp-1">
                            &quot;{approval.submission_notes}&quot;
                          </p>
                        )}
                        {approval.submitted_at && (
                          <p className="mt-1 text-xs text-stone-400">
                            Submitted {new Date(approval.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merit Badges Section */}
            {pendingBadgeApprovals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    id="select-all-badges"
                    checked={allBadgesSelected}
                    onCheckedChange={toggleAllBadges}
                    className={cn(someBadgesSelected && 'data-[state=checked]:bg-stone-400')}
                  />
                  <Medal className="h-4 w-4 text-amber-600" />
                  <label
                    htmlFor="select-all-badges"
                    className="text-sm font-medium text-stone-700 cursor-pointer flex-1"
                  >
                    Merit Badges ({selectedBadgeIds.size}/{pendingBadgeApprovals.length})
                  </label>
                </div>

                <div className="space-y-2 pl-1">
                  {pendingBadgeApprovals.map((badge) => (
                    <div
                      key={badge.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                        selectedBadgeIds.has(badge.id)
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      )}
                    >
                      <Checkbox
                        id={badge.id}
                        checked={selectedBadgeIds.has(badge.id)}
                        onCheckedChange={() => toggleBadgeSelection(badge.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {badge.scouts?.id ? (
                            <Link
                              href={`/scouts/${badge.scouts.id}`}
                              className="font-medium text-stone-900 hover:text-forest-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {badge.scouts.first_name} {badge.scouts.last_name}
                            </Link>
                          ) : (
                            <span className="font-medium text-stone-900">
                              {badge.scouts?.first_name} {badge.scouts?.last_name}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              badge.bsa_merit_badges?.is_eagle_required && "border-amber-500 text-amber-700"
                            )}
                          >
                            {badge.bsa_merit_badges?.name}
                            {badge.bsa_merit_badges?.is_eagle_required && (
                              <Star className="h-3 w-3 ml-1 fill-current" />
                            )}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">
                          All requirements completed - ready for final approval
                        </p>
                        {badge.completed_at && (
                          <p className="mt-1 text-xs text-stone-400">
                            Completed {new Date(badge.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result Message */}
        {approvalResult && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
              approvalResult.success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            {approvalResult.success && <CheckCircle2 className="h-4 w-4" />}
            {approvalResult.message}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={totalSelected === 0 || isApproving}
            className="bg-forest-600 hover:bg-forest-700"
          >
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              `Approve Selected (${totalSelected})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
