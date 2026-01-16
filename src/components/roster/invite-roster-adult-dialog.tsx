'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { inviteProfileToApp } from '@/app/actions/members'

type MemberRole = 'admin' | 'treasurer' | 'leader' | 'parent'

interface RosterAdult {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email?: string | null
  member_type: string | null
  position: string | null
  bsa_member_id: string | null
  user_id: string | null
}

interface InviteRosterAdultDialogProps {
  adult: RosterAdult
  unitId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: 'leader', label: 'Leader', description: 'Manage scouts and events' },
  { value: 'parent', label: 'Parent', description: 'View and manage own scouts' },
  { value: 'treasurer', label: 'Treasurer', description: 'Manage billing and payments' },
  { value: 'admin', label: 'Admin', description: 'Full access to all unit features' },
]

export function InviteRosterAdultDialog({
  adult,
  unitId,
  open,
  onOpenChange,
  onSuccess,
}: InviteRosterAdultDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [email, setEmail] = useState(adult.email || '')
  const [role, setRole] = useState<MemberRole>(
    adult.member_type === 'LEADER' ? 'leader' : 'parent'
  )

  const displayName = adult.full_name || `${adult.first_name || ''} ${adult.last_name || ''}`.trim() || 'Unknown'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setWarning(null)

    const result = await inviteProfileToApp({
      unitId,
      profileId: adult.id,
      email: email.trim(),
      role,
    })

    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Failed to send invite')
      return
    }

    if (result.warning) {
      setWarning(result.warning)
      // Still close after a delay if there's a warning (invite was created)
      setTimeout(() => {
        onOpenChange(false)
        onSuccess()
      }, 3000)
      return
    }

    onOpenChange(false)
    onSuccess()
  }

  const handleClose = () => {
    if (!isLoading) {
      setEmail(adult.email || '')
      setError(null)
      setWarning(null)
      setRole(adult.member_type === 'LEADER' ? 'leader' : 'parent')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite {displayName}</DialogTitle>
          <DialogDescription>
            Send an invitation to join your unit. They&apos;ll receive an email with a link to sign up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adult Info Display */}
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-stone-500">Name:</span>
                <span className="ml-2 font-medium">{displayName}</span>
              </div>
              {adult.bsa_member_id && (
                <div>
                  <span className="text-stone-500">BSA#:</span>
                  <span className="ml-2 font-medium">{adult.bsa_member_id}</span>
                </div>
              )}
              {adult.member_type && (
                <div>
                  <span className="text-stone-500">Type:</span>
                  <span className="ml-2 font-medium">
                    {adult.member_type === 'LEADER' ? 'Leader' : 'Parent'}
                  </span>
                </div>
              )}
              {adult.position && (
                <div>
                  <span className="text-stone-500">Position:</span>
                  <span className="ml-2 font-medium">{adult.position}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-500">
              {ROLES.find((r) => r.value === role)?.description}
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">{error}</div>
          )}

          {warning && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">{warning}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !email.trim()}>
              {isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
