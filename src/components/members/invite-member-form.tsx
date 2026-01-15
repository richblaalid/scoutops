'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteMember, type MemberRole } from '@/app/actions/members'

interface Scout {
  id: string
  first_name: string
  last_name: string
}

interface InviteMemberFormProps {
  unitId: string
  scouts: Scout[]
  onClose: () => void
  onSuccess: () => void
}

const ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all unit features' },
  { value: 'treasurer', label: 'Treasurer', description: 'Manage billing and payments' },
  { value: 'leader', label: 'Leader', description: 'Manage scouts and events' },
  { value: 'parent', label: 'Parent', description: 'View and manage own scouts' },
  { value: 'scout', label: 'Scout', description: 'View events and own account' },
]

export function InviteMemberForm({ unitId, scouts, onClose, onSuccess }: InviteMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('parent')
  const [selectedScoutIds, setSelectedScoutIds] = useState<string[]>([])

  const [selectedScoutId, setSelectedScoutId] = useState<string>('')

  const handleScoutToggle = (scoutId: string) => {
    setSelectedScoutIds(prev =>
      prev.includes(scoutId)
        ? prev.filter(id => id !== scoutId)
        : [...prev, scoutId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate parent has at least one scout selected
    if (role === 'parent' && selectedScoutIds.length === 0) {
      setError('Please select at least one scout for this parent')
      setIsLoading(false)
      return
    }

    // Validate scout role has a scout selected
    if (role === 'scout' && !selectedScoutId) {
      setError('Please select which scout this user represents')
      setIsLoading(false)
      return
    }

    const result = await inviteMember({
      unitId,
      email: email.trim(),
      role,
      scoutIds: role === 'parent' ? selectedScoutIds : undefined,
      linkedScoutId: role === 'scout' ? selectedScoutId : undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to send invite')
      setIsLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Invite Member</h2>
        <p className="mb-4 text-sm text-stone-600">
          Send an invitation to join your unit. They&apos;ll receive an email with a magic link to sign up or log in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                const newRole = e.target.value as MemberRole
                setRole(newRole)
                // Clear scout selections when changing roles
                if (newRole !== 'parent') {
                  setSelectedScoutIds([])
                }
                if (newRole !== 'scout') {
                  setSelectedScoutId('')
                }
              }}
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

          {role === 'parent' && (
            <div className="space-y-2">
              <Label>Link to Scout(s) *</Label>
              <p className="text-xs text-stone-500 mb-2">
                Select the scout(s) this parent is a guardian of
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {scouts.length === 0 ? (
                  <p className="text-sm text-stone-500 py-2 text-center">
                    No scouts in this unit yet
                  </p>
                ) : (
                  scouts.map((scout) => (
                    <label
                      key={scout.id}
                      className="flex items-center gap-2 rounded p-2 hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScoutIds.includes(scout.id)}
                        onChange={() => handleScoutToggle(scout.id)}
                        className="h-4 w-4 rounded border-stone-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">
                        {scout.first_name} {scout.last_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedScoutIds.length > 0 && (
                <p className="text-xs text-stone-600">
                  {selectedScoutIds.length} scout{selectedScoutIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {role === 'scout' && (
            <div className="space-y-2">
              <Label>Which Scout? *</Label>
              <p className="text-xs text-stone-500 mb-2">
                Select the scout this user represents
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {scouts.length === 0 ? (
                  <p className="text-sm text-stone-500 py-2 text-center">
                    No scouts in this unit yet
                  </p>
                ) : (
                  scouts.map((scout) => (
                    <label
                      key={scout.id}
                      className="flex items-center gap-2 rounded p-2 hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="linked-scout"
                        checked={selectedScoutId === scout.id}
                        onChange={() => setSelectedScoutId(scout.id)}
                        className="h-4 w-4 border-stone-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">
                        {scout.first_name} {scout.last_name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !email.trim()}>
              {isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
