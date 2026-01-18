'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { formatCurrency } from '@/lib/utils'

interface Guardian {
  profile_id: string
  is_primary: boolean
  profiles: {
    id: string
    email: string | null
    full_name: string | null
    first_name: string | null
  } | null
}

interface SendChargeNotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  billingChargeId: string
  scoutId: string
  amount: number
  description: string
  scoutName: string
}

export function SendChargeNotificationDialog({
  open,
  onOpenChange,
  billingChargeId,
  scoutId,
  amount,
  description,
  scoutName,
}: SendChargeNotificationDialogProps) {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [selectedGuardian, setSelectedGuardian] = useState<string>('')
  const [customMessage, setCustomMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingGuardians, setIsFetchingGuardians] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch guardians when dialog opens
  useEffect(() => {
    if (open && scoutId) {
      fetchGuardians()
    }
  }, [open, scoutId])

  const fetchGuardians = async () => {
    setIsFetchingGuardians(true)
    setError(null)

    const supabase = createClient()

    const { data, error: fetchError } = await supabase
      .from('scout_guardians')
      .select(`
        profile_id,
        is_primary,
        profiles (
          id,
          email,
          full_name,
          first_name
        )
      `)
      .eq('scout_id', scoutId)
      .order('is_primary', { ascending: false })

    setIsFetchingGuardians(false)

    if (fetchError) {
      setError('Failed to load guardians')
      return
    }

    const validGuardians = (data || []).filter(
      (g) => g.profiles?.email
    ) as Guardian[]

    setGuardians(validGuardians)

    // Auto-select primary guardian or first with email
    if (validGuardians.length > 0) {
      setSelectedGuardian(validGuardians[0].profile_id)
    }
  }

  const handleSend = async () => {
    if (!selectedGuardian) {
      setError('Please select a guardian')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/billing-charges/${billingChargeId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianProfileId: selectedGuardian,
          customMessage: customMessage.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification')
      }

      setSuccess(true)

      // Close dialog after showing success
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setCustomMessage('')
      setError(null)
      setSuccess(false)
      onOpenChange(false)
    }
  }

  const selectedGuardianData = guardians.find((g) => g.profile_id === selectedGuardian)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Payment Notification</DialogTitle>
          <DialogDescription>
            Send an email to the guardian with the charge details and a payment link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Charge Summary */}
          <div className="rounded-lg bg-stone-50 p-3">
            <p className="font-medium text-stone-900">{description}</p>
            <p className="text-sm text-stone-600">
              {scoutName}: {formatCurrency(amount)}
            </p>
          </div>

          {/* Guardian Selection */}
          <div className="space-y-2">
            <Label htmlFor="guardian">Send to</Label>
            {isFetchingGuardians ? (
              <p className="text-sm text-stone-500">Loading guardians...</p>
            ) : guardians.length === 0 ? (
              <p className="text-sm text-error">No guardians with email addresses found for this scout.</p>
            ) : (
              <select
                id="guardian"
                value={selectedGuardian}
                onChange={(e) => setSelectedGuardian(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
              >
                {guardians.map((guardian) => {
                  const profile = guardian.profiles
                  const name = profile?.first_name || profile?.full_name || 'Guardian'
                  const email = profile?.email || ''
                  return (
                    <option key={guardian.profile_id} value={guardian.profile_id}>
                      {name} ({email}){guardian.is_primary ? ' - Primary' : ''}
                    </option>
                  )
                })}
              </select>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom message (optional)</Label>
            <textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal note to the notification email..."
              disabled={isLoading}
              rows={3}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500 disabled:opacity-50"
            />
          </div>

          {/* Email Preview */}
          {selectedGuardianData && (
            <div className="rounded-lg border border-stone-200 p-3">
              <p className="text-xs font-medium text-stone-500 mb-1">Email will be sent to:</p>
              <p className="text-sm text-stone-900">{selectedGuardianData.profiles?.email}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-success-light p-3 text-sm text-success-dark">
              Notification sent successfully!
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={isLoading}
            loadingText="Sending..."
            disabled={guardians.length === 0 || !selectedGuardian}
          >
            Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
