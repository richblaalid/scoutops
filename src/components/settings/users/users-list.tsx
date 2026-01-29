'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateUserRole, removeUser, type UserRole } from '@/app/actions/users'

interface User {
  id: string
  role: string
  status: string
  email: string | null
  joined_at: string | null
  profiles: {
    id: string
    email: string
    full_name: string | null
  } | null
}

interface UsersListProps {
  users: User[]
  isAdmin: boolean
  currentUserId: string
  unitId: string
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'leader', label: 'Leader' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function UsersList({ users, isAdmin, currentUserId, unitId }: UsersListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingId(userId)
    setError(null)

    const result = await updateUserRole(unitId, userId, newRole)

    if (!result.success) {
      setError(result.error || 'Failed to update role')
    }

    setLoadingId(null)
  }

  const handleRemove = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this unit?`)) {
      return
    }

    setLoadingId(userId)
    setError(null)

    const result = await removeUser(unitId, userId)

    if (!result.success) {
      setError(result.error || 'Failed to remove user')
    }

    setLoadingId(null)
  }

  if (users.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-stone-500">No users in this unit yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm font-medium text-stone-500">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Joined</th>
              {isAdmin && <th className="pb-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrentUser = user.profiles?.id === currentUserId
              const displayName = user.profiles?.full_name || user.profiles?.email || 'Unknown'

              return (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">
                        {displayName}
                      </p>
                      {isCurrentUser && (
                        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs text-forest-700">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-stone-600">
                    {user.profiles?.email || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {isAdmin && !isCurrentUser ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={loadingId === user.id}
                        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm capitalize focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
                      >
                        {ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-stone-600">
                    {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : '—'}
                  </td>
                  {isAdmin && (
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {user.profiles && (
                          <Link
                            href={`/adults/${user.profiles.id}`}
                            className="text-sm text-forest-600 hover:text-forest-800"
                          >
                            View
                          </Link>
                        )}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleRemove(user.id, displayName)}
                            disabled={loadingId === user.id}
                            className="text-sm text-error hover:text-error/80 disabled:opacity-50"
                          >
                            {loadingId === user.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
