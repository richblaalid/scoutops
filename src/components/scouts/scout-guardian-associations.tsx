'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addScoutGuardian, removeScoutGuardian } from '@/app/actions/members'
import { Mail, Phone, Star } from 'lucide-react'

interface LinkedGuardian {
  id: string  // guardianship id
  relationship: string | null
  is_primary: boolean | null
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone_primary: string | null
  }
}

interface AvailableMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface ScoutGuardianAssociationsProps {
  unitId: string
  scoutId: string
  scoutName: string
  guardians: LinkedGuardian[]
  availableMembers: AvailableMember[]
  canEdit: boolean
}

export function ScoutGuardianAssociations({
  unitId,
  scoutId,
  scoutName,
  guardians,
  availableMembers,
  canEdit,
}: ScoutGuardianAssociationsProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter out already-linked guardians from available members
  const linkedProfileIds = new Set(guardians.map(g => g.profiles.id))
  const filteredAvailableMembers = availableMembers.filter(m => !linkedProfileIds.has(m.id))

  const handleAddGuardian = async () => {
    if (!selectedProfileId) return

    setLoadingId('add')
    setError(null)
    setSuccess(null)

    const result = await addScoutGuardian(unitId, selectedProfileId, scoutId, relationship)

    if (result.success) {
      setSuccess('Guardian added successfully')
      setSelectedProfileId('')
      setIsAdding(false)
    } else {
      setError(result.error || 'Failed to add guardian')
    }

    setLoadingId(null)
  }

  const handleRemoveGuardian = async (guardianshipId: string, guardianName: string) => {
    if (!confirm(`Are you sure you want to remove ${guardianName} as a guardian for ${scoutName}?`)) {
      return
    }

    setLoadingId(guardianshipId)
    setError(null)
    setSuccess(null)

    const result = await removeScoutGuardian(unitId, guardianshipId)

    if (result.success) {
      setSuccess('Guardian removed successfully')
    } else {
      setError(result.error || 'Failed to remove guardian')
    }

    setLoadingId(null)
  }

  const getGuardianName = (guardian: LinkedGuardian) => {
    const { first_name, last_name, email } = guardian.profiles
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim()
    }
    return email
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Guardians</CardTitle>
            <CardDescription>
              Parents and guardians linked to this scout
            </CardDescription>
          </div>
          {canEdit && filteredAvailableMembers.length > 0 && !isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              Add Guardian
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-error-light p-3 text-sm text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-success-light p-3 text-sm text-success">
            {success}
          </div>
        )}

        {/* Add Guardian Form */}
        {isAdding && canEdit && (
          <div className="mb-4 rounded-lg border border-dashed border-stone-300 p-4">
            <h4 className="mb-3 text-sm font-medium text-stone-700">Add Guardian</h4>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              >
                <option value="">Select a member...</option>
                {filteredAvailableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name || member.last_name
                      ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
                      : member.email}
                  </option>
                ))}
              </select>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              >
                <option value="parent">Parent</option>
                <option value="guardian">Guardian</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </select>
              <Button
                size="sm"
                onClick={handleAddGuardian}
                disabled={!selectedProfileId || loadingId === 'add'}
              >
                {loadingId === 'add' ? 'Adding...' : 'Add'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setSelectedProfileId('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Linked Guardians List */}
        {guardians.length > 0 ? (
          <div className="space-y-2">
            {guardians.map((guardian) => {
              const guardianName = getGuardianName(guardian)
              return (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-900">
                        {guardianName}
                      </p>
                      {guardian.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          <Star className="h-3 w-3" />
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 capitalize">
                      {guardian.relationship || 'Guardian'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                      {guardian.profiles.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {guardian.profiles.email}
                        </span>
                      )}
                      {guardian.profiles.phone_primary && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {guardian.profiles.phone_primary}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveGuardian(guardian.id, guardianName)}
                      disabled={loadingId === guardian.id}
                      className="ml-4 text-sm text-error hover:text-error/80 disabled:opacity-50"
                    >
                      {loadingId === guardian.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-stone-500">
            No guardians are linked to this scout.
            {canEdit && filteredAvailableMembers.length > 0 && ' Click "Add Guardian" to link a parent or guardian.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
