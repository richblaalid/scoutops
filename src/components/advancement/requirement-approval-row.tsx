'use client'

import { useState, useMemo } from 'react'
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
  Calendar,
  StickyNote,
  Undo2,
  User,
  History,
} from 'lucide-react'
import { markRequirementComplete, updateRequirementNotes, markRequirementCompleteWithInit, undoRequirementCompletion } from '@/app/actions/advancement'
import { RequirementCompletionDialog } from './requirement-completion-dialog'
import { RequirementUndoDialog } from './requirement-undo-dialog'
import { parseNotes, formatNoteTimestamp, getNoteTypeLabel, type RequirementNote } from '@/lib/notes-utils'
import type { AdvancementStatus } from '@/types/advancement'

interface RequirementApprovalRowProps {
  id: string
  requirementProgressId: string | null // Can be null for unstarted ranks
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
  // Current user info for dialogs
  currentUserName?: string
  // Optional props for initializing progress when marking complete on unstarted ranks
  initData?: {
    scoutId: string
    rankId: string
    versionId: string
  }
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
  currentUserName = 'Leader',
  initData,
}: RequirementApprovalRowProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteValue, setNoteValue] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Dialog states
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [undoDialogOpen, setUndoDialogOpen] = useState(false)

  const isComplete = ['completed', 'approved', 'awarded'].includes(status)
  const isPending = approvalStatus === 'pending_approval'
  const isDenied = approvalStatus === 'denied'
  // Can approve if we have either a progress ID or init data to create one
  const canApprove = canEdit && !isComplete && !isPending && (requirementProgressId || initData)
  // Can undo only completed (not approved/awarded) requirements
  const canUndo = canEdit && status === 'completed' && requirementProgressId

  // Parse notes from JSON or legacy format
  const parsedNotes = useMemo(() => parseNotes(notes), [notes])
  const hasNotes = parsedNotes.length > 0

  const handleComplete = async (completedAt: string, noteText: string) => {
    setIsLoading(true)
    try {
      let result
      if (requirementProgressId) {
        // Normal case: progress record exists
        result = await markRequirementComplete(requirementProgressId, unitId, completedAt, noteText || undefined)
      } else if (initData) {
        // No progress record yet: initialize and mark complete
        result = await markRequirementCompleteWithInit({
          scoutId: initData.scoutId,
          rankId: initData.rankId,
          requirementId: id,
          unitId,
          versionId: initData.versionId,
          completedAt,
          notes: noteText || undefined,
        })
      }
      if (result?.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
      }
    } catch (error) {
      console.error('Error completing requirement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUndo = async (reason: string) => {
    if (!requirementProgressId) return

    setIsLoading(true)
    try {
      const result = await undoRequirementCompletion(requirementProgressId, unitId, reason)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error undoing requirement:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!canEdit || isSavingNotes || !requirementProgressId) return

    setIsSavingNotes(true)
    try {
      await updateRequirementNotes(requirementProgressId, unitId, noteValue)
      setNotesOpen(false)
      setNoteValue('')
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    if (!canEdit || isComplete) return

    if (onSelectionChange && requirementProgressId) {
      onSelectionChange(requirementProgressId, checked)
    } else if (checked) {
      // If no selection handler or no progress ID, open completion dialog
      setCompletionDialogOpen(true)
    }
  }

  // Notes are only available if there's a progress record
  const canAddNotes = canEdit && requirementProgressId

  return (
    <>
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

                {/* Notes Indicator with Multi-note Display */}
                {hasNotes && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 text-stone-500 hover:text-stone-700">
                        <History className="h-3 w-3" />
                        {parsedNotes.length} note{parsedNotes.length !== 1 ? 's' : ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <div className="border-b bg-stone-50 px-3 py-2">
                        <h4 className="text-sm font-medium">Notes History</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {parsedNotes.map((note) => (
                          <NoteEntry key={note.id} note={note} />
                        ))}
                      </div>
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
              {/* Add Notes Button */}
              {canAddNotes && (
                <Popover open={notesOpen} onOpenChange={setNotesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100',
                        hasNotes && 'opacity-100'
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Add Note</h4>
                      <Textarea
                        placeholder="Add a note about this requirement..."
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNotesOpen(false)
                            setNoteValue('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes || !noteValue.trim()}
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

              {/* Undo Button - for completed requirements */}
              {canUndo && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100',
                    'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                  )}
                  onClick={() => setUndoDialogOpen(true)}
                  disabled={isLoading}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}

              {/* Complete Button */}
              {canApprove && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2 opacity-0 transition-all group-hover:opacity-100',
                    'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                  )}
                  onClick={() => setCompletionDialogOpen(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Complete
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
              <span className="text-sm font-medium">Completed!</span>
            </div>
          </div>
        )}
      </div>

      {/* Completion Dialog */}
      <RequirementCompletionDialog
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        requirementNumber={requirementNumber}
        requirementDescription={description}
        currentUserName={currentUserName}
        onComplete={handleComplete}
      />

      {/* Undo Dialog */}
      <RequirementUndoDialog
        open={undoDialogOpen}
        onOpenChange={setUndoDialogOpen}
        requirementNumber={requirementNumber}
        requirementDescription={description}
        onUndo={handleUndo}
      />
    </>
  )
}

// Note entry component for the multi-note display
function NoteEntry({ note }: { note: RequirementNote }) {
  const typeColors = {
    completion: 'bg-emerald-100 text-emerald-700',
    undo: 'bg-amber-100 text-amber-700',
    general: 'bg-stone-100 text-stone-700',
  }

  return (
    <div className="border-b last:border-b-0 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', typeColors[note.type])}>
          {getNoteTypeLabel(note.type)}
        </Badge>
        <span className="text-[10px] text-stone-400">
          {formatNoteTimestamp(note.timestamp)}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{note.text}</p>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-400">
        <User className="h-2.5 w-2.5" />
        {note.author}
      </div>
    </div>
  )
}
