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
  section_unit_id: string | null
  profiles: {
    id: string
    email: string
    full_name: string | null
  } | null
}

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface MembersListProps {
  members: Member[]
  isAdmin: boolean
  currentUserId: string
  unitId: string
  sections?: Section[]
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'leader', label: 'Leader' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function MembersList({ members, isAdmin, currentUserId, unitId, sections = [] }: MembersListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Track pending role changes that need section selection
  const [pendingLeaderChange, setPendingLeaderChange] = useState<{ memberId: string; sectionId: string } | null>(null)

  const hasSections = sections.length > 0

  const handleRoleChange = async (memberId: string, newRole: MemberRole, sectionUnitId?: string | null) => {
    // If changing to leader and sections exist, require section selection
    if (newRole === 'leader' && hasSections && !sectionUnitId) {
      setPendingLeaderChange({ memberId, sectionId: '' })
      return
    }

    setLoadingId(memberId)
    setError(null)
    setPendingLeaderChange(null)

    const result = await updateMemberRole(unitId, memberId, newRole, sectionUnitId)

    if (!result.success) {
      setError(result.error || 'Failed to update role')
    }

    setLoadingId(null)
  }

  const handleSectionConfirm = async () => {
    if (!pendingLeaderChange || !pendingLeaderChange.sectionId) {
      setError('Please select a section for this leader')
      return
    }

    setLoadingId(pendingLeaderChange.memberId)
    setError(null)

    const result = await updateMemberRole(unitId, pendingLeaderChange.memberId, 'leader', pendingLeaderChange.sectionId)

    if (!result.success) {
      setError(result.error || 'Failed to update role')
    }

    setPendingLeaderChange(null)
    setLoadingId(null)
  }

  const handleSectionCancel = () => {
    setPendingLeaderChange(null)
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
                      <div className="flex flex-col gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                          disabled={loadingId === member.id || pendingLeaderChange?.memberId === member.id}
                          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm capitalize focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
                        >
                          {ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {/* Show current section assignment for leaders */}
                        {member.role === 'leader' && hasSections && member.section_unit_id && (
                          <span className="text-xs text-stone-500">
                            Troop {sections.find(s => s.id === member.section_unit_id)?.unit_number} ({sections.find(s => s.id === member.section_unit_id)?.unit_gender === 'boys' ? 'Boys' : 'Girls'})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
                          {member.role}
                        </span>
                        {member.role === 'leader' && hasSections && member.section_unit_id && (
                          <span className="text-xs text-stone-500">
                            Troop {sections.find(s => s.id === member.section_unit_id)?.unit_number} ({sections.find(s => s.id === member.section_unit_id)?.unit_gender === 'boys' ? 'Boys' : 'Girls'})
                          </span>
                        )}
                      </div>
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
                            href={`/members/${member.id}`}
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

      {/* Section Selection Modal */}
      {pendingLeaderChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-stone-900">Assign Leader to Section</h3>
            <p className="mb-4 text-sm text-stone-600">
              Leaders must be assigned to a specific section (boys or girls troop).
            </p>
            <div className="space-y-4">
              <select
                value={pendingLeaderChange.sectionId}
                onChange={(e) => setPendingLeaderChange({ ...pendingLeaderChange, sectionId: e.target.value })}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              >
                <option value="">Select a section...</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    Troop {section.unit_number} ({section.unit_gender === 'boys' ? 'Boys' : 'Girls'})
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleSectionCancel}
                  className="rounded-md px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSectionConfirm}
                  disabled={!pendingLeaderChange.sectionId || loadingId !== null}
                  className="rounded-md bg-forest-600 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-50"
                >
                  {loadingId ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
