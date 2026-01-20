'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  Check,
  Clock,
  AlertCircle,
  MessageSquare,
  Loader2,
  ChevronRight,
  User,
  Calendar,
  StickyNote,
} from 'lucide-react'
import { markRequirementComplete, updateRequirementNotes } from '@/app/actions/advancement'
import type { AdvancementStatus } from '@/types/advancement'

interface RequirementApprovalRowProps {
  id: string
  requirementProgressId: string
  requirementNumber: string
  description: string
  status: AdvancementStatus
  completedAt: string | null
  completedBy: string | null
  notes: string | null
  approvalStatus: string | null
  unitId: string
  canEdit: boolean
  isSelected?: boolean
  onSelectionChange?: (id: string, selected: boolean) => void
}

export function RequirementApprovalRow({
  id,
  requirementProgressId,
  requirementNumber,
  description,
  status,
  completedAt,
  completedBy,
  notes,
  approvalStatus,
  unitId,
  canEdit,
  isSelected = false,
  onSelectionChange,
}: RequirementApprovalRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteValue, setNoteValue] = useState(notes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const isComplete = ['completed', 'approved', 'awarded'].includes(status)
  const isPending = approvalStatus === 'pending_approval'
  const isDenied = approvalStatus === 'denied'
  const canApprove = canEdit && !isComplete && !isPending

  const handleQuickApprove = async () => {
    if (!canApprove || isLoading) return

    setIsLoading(true)
    try {
      const result = await markRequirementComplete(requirementProgressId, unitId)
      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Error approving requirement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!canEdit || isSavingNotes) return

    setIsSavingNotes(true)
    try {
      await updateRequirementNotes(requirementProgressId, unitId, noteValue)
      setNotesOpen(false)
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    if (!canEdit || isComplete) return

    if (onSelectionChange) {
      onSelectionChange(requirementProgressId, checked)
    } else if (checked) {
      // If no selection handler, treat checkbox as quick approve
      handleQuickApprove()
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-lg p-3 transition-all',
        showSuccess && 'bg-emerald-50 ring-1 ring-emerald-200',
        isComplete && !showSuccess && 'bg-emerald-50/50',
        isPending && 'bg-amber-50',
        isDenied && 'bg-red-50',
        !isComplete && !isPending && !isDenied && 'hover:bg-stone-50',
        isSelected && 'bg-blue-50 ring-1 ring-blue-200'
      )}
    >
      {/* Selection/Completion Checkbox */}
      <div className="flex h-6 items-center">
        {canEdit ? (
          <Checkbox
            checked={isSelected || isComplete || showSuccess}
            disabled={isLoading || status === 'approved' || status === 'awarded'}
            onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
            className={cn(
              'transition-all',
              (isComplete || showSuccess) && 'border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500'
            )}
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center">
            {isComplete ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            ) : isPending ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : isDenied ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <div className="h-4 w-4 rounded border-2 border-stone-300" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {/* Requirement Number & Description */}
            <p
              className={cn(
                'text-sm leading-relaxed',
                (isComplete || showSuccess) && 'text-stone-500 line-through decoration-emerald-400'
              )}
            >
              <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-stone-100 text-xs font-bold text-stone-600">
                {requirementNumber}
              </span>
              {description}
            </p>

            {/* Metadata Row */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {/* Completion Info */}
              {completedAt && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Calendar className="h-3 w-3" />
                  {new Date(completedAt).toLocaleDateString()}
                </span>
              )}

              {/* Notes Indicator */}
              {notes && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 text-stone-500 hover:text-stone-700">
                      <StickyNote className="h-3 w-3" />
                      Notes
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 text-sm">
                    <p className="text-stone-600">{notes}</p>
                  </PopoverContent>
                </Popover>
              )}

              {/* Status Badges */}
              {isPending && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  <Clock className="mr-1 h-3 w-3" />
                  Pending Approval
                </Badge>
              )}
              {isDenied && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Denied
                </Badge>
              )}
              {status === 'approved' && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Check className="mr-1 h-3 w-3" />
                  Approved
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Notes Button */}
            {canEdit && (
              <Popover open={notesOpen} onOpenChange={setNotesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100',
                      notes && 'opacity-100'
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Requirement Notes</h4>
                    <Textarea
                      placeholder="Add notes about this requirement..."
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotesOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Quick Approve Button */}
            {canApprove && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-2 opacity-0 transition-all group-hover:opacity-100',
                  'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                )}
                onClick={handleQuickApprove}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-emerald-50/80">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Approved!</span>
          </div>
        </div>
      )}
    </div>
  )
}
