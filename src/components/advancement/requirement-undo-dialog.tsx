'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Undo2, Loader2, AlertTriangle } from 'lucide-react'

interface RequirementUndoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requirementNumber: string
  requirementDescription: string
  onUndo: (reason: string) => Promise<void>
}

export function RequirementUndoDialog({
  open,
  onOpenChange,
  requirementNumber,
  requirementDescription,
  onUndo,
}: RequirementUndoDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('A reason is required to undo a completed requirement')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onUndo(reason.trim())
      // Reset form on success
      setReason('')
      onOpenChange(false)
    } catch (err) {
      setError('Failed to undo requirement. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setReason('')
      setError(null)
    }
    onOpenChange(isOpen)
  }

  // Truncate description for display
  const truncatedDescription =
    requirementDescription.length > 150
      ? `${requirementDescription.slice(0, 150)}...`
      : requirementDescription

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-amber-600" />
            Undo Requirement {requirementNumber}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {truncatedDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This action will:</p>
            <ul className="mt-1 list-inside list-disc text-amber-700">
              <li>Mark this requirement as not completed</li>
              <li>Record this undo action in the notes history</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* Reason (required) */}
          <div className="space-y-2">
            <Label htmlFor="undo-reason" className="text-sm font-medium">
              Reason for Undo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="undo-reason"
              placeholder="Why are you undoing this completion? (e.g., marked for wrong scout, incorrect date, etc.)"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              rows={3}
              className={error ? 'border-red-300 focus-visible:ring-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            variant="destructive"
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Undoing...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4" />
                Undo Completion
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
