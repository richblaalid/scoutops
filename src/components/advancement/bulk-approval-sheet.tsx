'use client'

import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  CheckSquare,
  Check,
  Calendar,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { bulkApproveRequirements } from '@/app/actions/advancement'
import type { AdvancementStatus } from '@/types/advancement'

interface Requirement {
  id: string
  requirementProgressId: string
  requirementNumber: string
  description: string
  status: AdvancementStatus
}

interface BulkApprovalSheetProps {
  requirements: Requirement[]
  rankName: string
  unitId: string
  scoutId: string
  trigger?: React.ReactNode
  onComplete?: () => void
}

export function BulkApprovalSheet({
  requirements,
  rankName,
  unitId,
  scoutId,
  trigger,
  onComplete,
}: BulkApprovalSheetProps) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  // Filter to incomplete requirements only
  const incompleteRequirements = useMemo(() => {
    return requirements.filter(
      req => !['completed', 'approved', 'awarded'].includes(req.status)
    )
  }, [requirements])

  const allSelected = selectedIds.size === incompleteRequirements.length && incompleteRequirements.length > 0
  const someSelected = selectedIds.size > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(incompleteRequirements.map(r => r.requirementProgressId)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return

    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const response = await bulkApproveRequirements(
        Array.from(selectedIds),
        unitId,
        `${completedDate}T12:00:00.000Z`,
        notes || undefined
      )

      if (response.success && response.data) {
        setResult({
          success: response.data.successCount,
          failed: response.data.failedCount,
        })

        if (response.data.failedCount === 0) {
          // All succeeded - close after brief delay
          setTimeout(() => {
            setOpen(false)
            onComplete?.()
            // Reset state
            setSelectedIds(new Set())
            setNotes('')
            setResult(null)
          }, 1500)
        }
      } else {
        setError(response.error || 'Failed to approve requirements')
      }
    } catch (err) {
      console.error('Error in bulk approval:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      // Reset state when closing
      setSelectedIds(new Set())
      setNotes('')
      setError(null)
      setResult(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Bulk Approve
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-forest-600" />
            Bulk Approve Requirements
          </SheetTitle>
          <SheetDescription>
            Select requirements to approve for {rankName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Success Message */}
          {result && result.failed === 0 && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Success!</p>
                <p className="text-sm">Approved {result.success} requirement{result.success !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Date & Notes */}
          {!result && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="completion-date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stone-500" />
                  Completion Date
                </Label>
                <Input
                  id="completion-date"
                  type="date"
                  value={completedDate}
                  onChange={(e) => setCompletedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes for these requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Requirements List */}
          {!result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Requirements</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs"
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {incompleteRequirements.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Check className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm text-stone-500">
                    All requirements are already complete!
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[280px] rounded-lg border">
                  <div className="divide-y">
                    {incompleteRequirements.map((req) => (
                      <label
                        key={req.requirementProgressId}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-stone-50',
                          selectedIds.has(req.requirementProgressId) && 'bg-blue-50'
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(req.requirementProgressId)}
                          onCheckedChange={() => handleSelectOne(req.requirementProgressId)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="mr-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-stone-100 px-1 text-xs font-bold text-stone-600">
                              {req.requirementNumber}
                            </span>
                            {req.description.length > 100
                              ? `${req.description.slice(0, 100)}...`
                              : req.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Selection Summary */}
              {someSelected && (
                <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                  <span className="text-sm text-blue-700">
                    {selectedIds.size} requirement{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Ready to approve
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          {!result ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Approve {selectedIds.size > 0 ? selectedIds.size : ''} Requirement{selectedIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          ) : result.failed > 0 ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
