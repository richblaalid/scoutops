'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateMemberRole, removeMember, type MemberRole } from '@/app/actions/members'

interface Member {
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

interface MembersListProps {
  members: Member[]
  isAdmin: boolean
  currentUserId: string
  unitId: string
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'leader', label: 'Leader' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function MembersList({ members, isAdmin, currentUserId, unitId }: MembersListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    setLoadingId(memberId)
    setError(null)

    const result = await updateMemberRole(unitId, memberId, newRole)

    if (!result.success) {
      setError(result.error || 'Failed to update role')
    }

    setLoadingId(null)
  }

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this unit?`)) {
      return
    }

    setLoadingId(memberId)
    setError(null)

    const result = await removeMember(unitId, memberId)

    if (!result.success) {
      setError(result.error || 'Failed to remove member')
    }

    setLoadingId(null)
  }

  if (members.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-stone-500">No members in this unit yet.</p>
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
            {members.map((member) => {
              const isCurrentUser = member.profiles?.id === currentUserId
              const displayName = member.profiles?.full_name || member.profiles?.email || 'Unknown'

              return (
                <tr key={member.id} className="border-b last:border-0">
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
                    {member.profiles?.email || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {isAdmin && !isCurrentUser ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                        disabled={loadingId === member.id}
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
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-stone-600">
                    {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
                  </td>
                  {isAdmin && (
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {member.profiles && (
                          <Link
                            href={`/adults/${member.profiles.id}`}
                            className="text-sm text-forest-600 hover:text-forest-800"
                          >
                            View
                          </Link>
                        )}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleRemove(member.id, displayName)}
                            disabled={loadingId === member.id}
                            className="text-sm text-error hover:text-error/80 disabled:opacity-50"
                          >
                            {loadingId === member.id ? 'Removing...' : 'Remove'}
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
