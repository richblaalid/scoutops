'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addScoutGuardian, removeScoutGuardian } from '@/app/actions/members'
import { Mail, Star, UserCircle } from 'lucide-react'

interface LinkedGuardian {
  id: string  // guardianship id
  relationship: string | null
  is_primary: boolean | null
  profile_id: string
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    email: string | null
    member_type: string | null
    position: string | null
    user_id: string | null
  }
}

interface AvailableProfile {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  member_type: string | null
  user_id: string | null
}

interface ScoutGuardianAssociationsProps {
  unitId: string
  scoutId: string
  scoutName: string
  guardians: LinkedGuardian[]
  availableProfiles: AvailableProfile[]
  canEdit: boolean
}

export function ScoutGuardianAssociations({
  unitId,
  scoutId,
  scoutName,
  guardians,
  availableProfiles,
  canEdit,
}: ScoutGuardianAssociationsProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter out already-linked guardians from available profiles and sort by last name
  const linkedProfileIds = new Set(guardians.map(g => g.profile_id))
  const filteredAvailableProfiles = availableProfiles
    .filter(p => !linkedProfileIds.has(p.id))
    .sort((a, b) => {
      const lastNameA = (a.last_name || '').toLowerCase()
      const lastNameB = (b.last_name || '').toLowerCase()
      if (lastNameA !== lastNameB) return lastNameA.localeCompare(lastNameB)
      const firstNameA = (a.first_name || '').toLowerCase()
      const firstNameB = (b.first_name || '').toLowerCase()
      return firstNameA.localeCompare(firstNameB)
    })

  const hasAvailableOptions = filteredAvailableProfiles.length > 0

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

  const getGuardianName = (guardian: LinkedGuardian): string => {
    const { first_name, last_name, full_name, email } = guardian.profiles
    if (full_name) {
      return full_name
    }
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim()
    }
    return email || 'Unknown'
  }

  const getProfileDisplayName = (profile: AvailableProfile): string => {
    if (profile.full_name) {
      return profile.full_name
    }
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }
    return profile.email || 'Unknown'
  }

  const isAppUser = (profile: { user_id: string | null }): boolean => {
    return !!profile.user_id
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
          {canEdit && hasAvailableOptions && !isAdding && (
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
                <option value="">Select an adult...</option>
                {filteredAvailableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getProfileDisplayName(profile)}
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
              const guardianEmail = guardian.profiles.email
              const hasAccount = isAppUser(guardian.profiles)

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
                      {hasAccount && (
                        <span className="inline-flex items-center gap-1 rounded bg-forest-100 px-1.5 py-0.5 text-xs font-medium text-forest-700">
                          <UserCircle className="h-3 w-3" />
                          App User
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 capitalize">
                      {guardian.relationship || 'Guardian'}
                      {guardian.profiles.position && (
                        <span className="text-stone-400"> · {guardian.profiles.position}</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                      {guardianEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {guardianEmail}
                        </span>
                      )}
                      {!hasAccount && (
                        <span className="text-stone-400 italic">
                          Not yet invited to app
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
            {canEdit && hasAvailableOptions && ' Click "Add Guardian" to link a parent or guardian.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
