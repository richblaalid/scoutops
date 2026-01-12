'use client'

import { useState } from 'react'
import { updateMemberRole, type MemberRole } from '@/app/actions/members'

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface MemberRoleEditorProps {
  membershipId: string
  unitId: string
  currentRole: string
  currentSectionId?: string | null
  sections?: Section[]
  isCurrentUser: boolean
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'leader', label: 'Leader' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function MemberRoleEditor({
  membershipId,
  unitId,
  currentRole,
  currentSectionId,
  sections = [],
  isCurrentUser,
}: MemberRoleEditorProps) {
  const [role, setRole] = useState(currentRole)
  const [sectionId, setSectionId] = useState(currentSectionId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pendingRole, setPendingRole] = useState<MemberRole | null>(null)

  const hasSections = sections.length > 0

  const handleRoleChange = async (newRole: MemberRole) => {
    if (newRole === role && !pendingRole) return

    // If changing to leader and sections exist, need to select a section first
    if (newRole === 'leader' && hasSections && !sectionId) {
      setPendingRole(newRole)
      setError('Please select a section for this leader')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setPendingRole(null)

    // If changing away from leader, clear section assignment
    const newSectionId = newRole === 'leader' ? sectionId : null

    const result = await updateMemberRole(unitId, membershipId, newRole, newSectionId)

    if (result.success) {
      setRole(newRole)
      if (newRole !== 'leader') {
        setSectionId('')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } else {
      setError(result.error || 'Failed to update role')
    }

    setLoading(false)
  }

  const handleSectionChange = async (newSectionId: string) => {
    setSectionId(newSectionId)
    setError(null)

    // If there's a pending role change to leader, complete it now
    if (pendingRole === 'leader' && newSectionId) {
      setLoading(true)
      setPendingRole(null)

      const result = await updateMemberRole(unitId, membershipId, 'leader', newSectionId)

      if (result.success) {
        setRole('leader')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result.error || 'Failed to update role')
      }

      setLoading(false)
    } else if (role === 'leader' && newSectionId) {
      // If already a leader, just update the section
      setLoading(true)

      const result = await updateMemberRole(unitId, membershipId, 'leader', newSectionId)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result.error || 'Failed to update section')
      }

      setLoading(false)
    }
  }

  // Don't allow editing your own role
  if (isCurrentUser) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-medium capitalize text-stone-700">
          {role}
        </span>
        {role === 'leader' && hasSections && currentSectionId && (
          <p className="text-xs text-stone-500">
            Troop {sections.find(s => s.id === currentSectionId)?.unit_number} ({sections.find(s => s.id === currentSectionId)?.unit_gender === 'boys' ? 'Boys' : 'Girls'})
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <select
          value={pendingRole || role}
          onChange={(e) => handleRoleChange(e.target.value as MemberRole)}
          disabled={loading}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm capitalize focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 disabled:opacity-50"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Section selector for leaders when sections exist */}
      {(role === 'leader' || pendingRole === 'leader') && hasSections && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600">
            Assigned Section {pendingRole === 'leader' && <span className="text-error">*</span>}
          </label>
          <select
            value={sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600 disabled:opacity-50"
          >
            <option value="">Select section...</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                Troop {section.unit_number} ({section.unit_gender === 'boys' ? 'Boys' : 'Girls'})
              </option>
            ))}
          </select>
        </div>
      )}

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
