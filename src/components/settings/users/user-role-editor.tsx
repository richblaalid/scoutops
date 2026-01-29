'use client'

import { useState } from 'react'
import { updateUserRole, type UserRole } from '@/app/actions/users'

interface UserRoleEditorProps {
  membershipId: string
  unitId: string
  currentRole: string
  isCurrentUser: boolean
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'leader', label: 'Leader' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function UserRoleEditor({
  membershipId,
  unitId,
  currentRole,
  isCurrentUser,
}: UserRoleEditorProps) {
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === role) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await updateUserRole(unitId, membershipId, newRole)

    if (result.success) {
      setRole(newRole)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } else {
      setError(result.error || 'Failed to update role')
    }

    setLoading(false)
  }

  // Don't allow editing your own role
  if (isCurrentUser) {
    return (
      <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
        {role}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        disabled={loading}
        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm capitalize focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {loading && (
        <p className="text-xs text-stone-500">Updating...</p>
      )}
      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
      {success && (
        <p className="text-xs text-forest-600">Updated successfully</p>
      )}
    </div>
  )
}
