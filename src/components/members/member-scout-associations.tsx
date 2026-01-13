'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { addScoutGuardian, removeScoutGuardian } from '@/app/actions/members'

interface LinkedScout {
  guardianshipId: string
  relationship: string | null
  scout: {
    id: string
    first_name: string
    last_name: string
    is_active: boolean | null
  }
}

interface AvailableScout {
  id: string
  first_name: string
  last_name: string
}

interface MemberScoutAssociationsProps {
  profileId: string
  linkedScouts: LinkedScout[]
  availableScouts: AvailableScout[]
}

export function MemberScoutAssociations({
  profileId,
  linkedScouts,
  availableScouts,
}: MemberScoutAssociationsProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedScoutId, setSelectedScoutId] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAddScout = async () => {
    if (!selectedScoutId) return

    setLoadingId('add')
    setError(null)
    setSuccess(null)

    const result = await addScoutGuardian(profileId, selectedScoutId, relationship)

    if (result.success) {
      setSuccess('Scout association added successfully')
      setSelectedScoutId('')
      setIsAdding(false)
    } else {
      setError(result.error || 'Failed to add scout association')
    }

    setLoadingId(null)
  }

  const handleRemoveScout = async (guardianshipId: string, scoutName: string) => {
    if (!confirm(`Are you sure you want to remove the association with ${scoutName}?`)) {
      return
    }

    setLoadingId(guardianshipId)
    setError(null)
    setSuccess(null)

    const result = await removeScoutGuardian(guardianshipId)

    if (result.success) {
      setSuccess('Scout association removed successfully')
    } else {
      setError(result.error || 'Failed to remove scout association')
    }

    setLoadingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Associated Scouts</CardTitle>
            <CardDescription>
              Scouts linked to this member (for parent/guardian access)
            </CardDescription>
          </div>
          {availableScouts.length > 0 && !isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              Add Scout
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

        {/* Add Scout Form */}
        {isAdding && (
          <div className="mb-4 rounded-lg border border-dashed border-stone-300 p-4">
            <h4 className="mb-3 text-sm font-medium text-stone-700">Add Scout Association</h4>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedScoutId}
                onChange={(e) => setSelectedScoutId(e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
              >
                <option value="">Select a scout...</option>
                {availableScouts.map((scout) => (
                  <option key={scout.id} value={scout.id}>
                    {scout.first_name} {scout.last_name}
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
                onClick={handleAddScout}
                disabled={!selectedScoutId || loadingId === 'add'}
              >
                {loadingId === 'add' ? 'Adding...' : 'Add'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false)
                  setSelectedScoutId('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Linked Scouts List */}
        {linkedScouts.length > 0 ? (
          <div className="space-y-2">
            {linkedScouts.map((ls) => (
              <div
                key={ls.guardianshipId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {ls.scout.first_name} {ls.scout.last_name}
                    {!ls.scout.is_active && (
                      <span className="ml-2 text-xs text-stone-500">(Inactive)</span>
                    )}
                  </p>
                  <p className="text-sm text-stone-500 capitalize">
                    {ls.relationship || 'Guardian'}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleRemoveScout(
                      ls.guardianshipId,
                      `${ls.scout.first_name} ${ls.scout.last_name}`
                    )
                  }
                  disabled={loadingId === ls.guardianshipId}
                  className="text-sm text-error hover:text-error/80 disabled:opacity-50"
                >
                  {loadingId === ls.guardianshipId ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500">
            No scouts are associated with this member.
            {availableScouts.length > 0 && ' Click "Add Scout" to create an association.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
