'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addScoutGuardian, removeScoutGuardian } from '@/app/actions/members'
import { MONTHS, SCOUT_RANKS, parseDateParts } from '@/lib/constants'
import { Mail, Star } from 'lucide-react'

interface Patrol {
  id: string
  name: string
}

interface Guardian {
  id: string
  relationship: string | null
  is_primary: boolean | null
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface AvailableMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface ScoutFormProps {
  unitId: string
  scout?: {
    id: string
    first_name: string
    last_name: string
    patrol_id: string | null
    rank: string | null
    date_of_birth: string | null
    bsa_member_id: string | null
    is_active: boolean | null
  }
  guardians?: Guardian[]
  availableMembers?: AvailableMember[]
  onClose: () => void
  onSuccess: () => void
}

export function ScoutForm({ unitId, scout, guardians: initialGuardians = [], availableMembers: initialAvailableMembers = [], onClose, onSuccess }: ScoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patrols, setPatrols] = useState<Patrol[]>([])
  const [selectedPatrolId, setSelectedPatrolId] = useState<string>(scout?.patrol_id || '')

  // Guardian data - can be passed in or fetched dynamically
  const [guardians, setGuardians] = useState<Guardian[]>(initialGuardians)
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>(initialAvailableMembers)
  const [guardiansLoaded, setGuardiansLoaded] = useState(initialGuardians.length > 0 || !scout)

  // Guardian management state
  const [isAddingGuardian, setIsAddingGuardian] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [guardianLoadingId, setGuardianLoadingId] = useState<string | null>(null)
  const [guardianError, setGuardianError] = useState<string | null>(null)
  const [guardianSuccess, setGuardianSuccess] = useState<string | null>(null)

  const initialDate = parseDateParts(scout?.date_of_birth)
  const [birthYear, setBirthYear] = useState(initialDate.year)
  const [birthMonth, setBirthMonth] = useState(initialDate.month)
  const [birthDay, setBirthDay] = useState(initialDate.day)

  // Fetch patrols for the unit
  useEffect(() => {
    async function fetchPatrols() {
      const supabase = createClient()
      const { data } = await supabase
        .from('patrols')
        .select('id, name')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('display_order')
        .order('name')

      if (data) {
        setPatrols(data)
      }
    }
    fetchPatrols()
  }, [unitId])

  // Fetch guardians and available members if not provided and editing a scout
  useEffect(() => {
    if (!scout || guardiansLoaded) return

    const scoutId = scout.id // Capture for async closure

    async function fetchGuardiansAndMembers() {
      const supabase = createClient()

      // Fetch guardians for this scout
      const { data: guardiansData } = await supabase
        .from('scout_guardians')
        .select(`
          id,
          relationship,
          is_primary,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('scout_id', scoutId)

      if (guardiansData) {
        setGuardians(guardiansData as Guardian[])
      }

      // Fetch available members (profiles with active unit memberships)
      const { data: membersData } = await supabase
        .from('unit_memberships')
        .select(`
          profile_id,
          profiles!unit_memberships_profile_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('unit_id', unitId)
        .eq('status', 'active')

      if (membersData) {
        type MemberRow = { profiles: AvailableMember | null }
        const members = (membersData as unknown as MemberRow[])
          .map((m) => m.profiles)
          .filter((p): p is AvailableMember => p !== null)
        setAvailableMembers(members)
      }

      setGuardiansLoaded(true)
    }

    fetchGuardiansAndMembers()
  }, [scout, unitId, guardiansLoaded])

  // Generate years from current year going back 50 years (descending order)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 51 }, (_, i) => currentYear - i)
  }, [])

  // Generate days based on selected month and year
  const days = useMemo(() => {
    if (!birthMonth) return Array.from({ length: 31 }, (_, i) => i + 1)
    const year = birthYear ? parseInt(birthYear) : new Date().getFullYear()
    const month = parseInt(birthMonth)
    const daysInMonth = new Date(year, month, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => i + 1)
  }, [birthMonth, birthYear])

  // Construct date string for form submission
  const dateOfBirth = birthYear && birthMonth && birthDay
    ? `${birthYear}-${birthMonth}-${birthDay.padStart(2, '0')}`
    : ''

  // Filter out already-linked guardians from available members
  const linkedProfileIds = new Set(guardians.map(g => g.profiles.id))
  const filteredAvailableMembers = availableMembers.filter(m => !linkedProfileIds.has(m.id))

  const getGuardianName = (guardian: Guardian) => {
    const { first_name, last_name, email } = guardian.profiles
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim()
    }
    return email
  }

  // Helper to refetch guardians after changes
  const refetchGuardians = async () => {
    if (!scout) return

    const supabase = createClient()
    const { data: guardiansData } = await supabase
      .from('scout_guardians')
      .select(`
        id,
        relationship,
        is_primary,
        profiles (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('scout_id', scout.id)

    if (guardiansData) {
      setGuardians(guardiansData as Guardian[])
    }
  }

  const handleAddGuardian = async () => {
    if (!selectedProfileId || !scout) return

    setGuardianLoadingId('add')
    setGuardianError(null)
    setGuardianSuccess(null)

    const result = await addScoutGuardian(unitId, selectedProfileId, scout.id, relationship)

    if (result.success) {
      setGuardianSuccess('Guardian added successfully')
      setSelectedProfileId('')
      setIsAddingGuardian(false)
      // Refetch guardians to update local state
      await refetchGuardians()
    } else {
      setGuardianError(result.error || 'Failed to add guardian')
    }

    setGuardianLoadingId(null)
  }

  const handleRemoveGuardian = async (guardianshipId: string, guardianName: string) => {
    if (!confirm(`Remove ${guardianName} as a guardian?`)) {
      return
    }

    setGuardianLoadingId(guardianshipId)
    setGuardianError(null)
    setGuardianSuccess(null)

    const result = await removeScoutGuardian(unitId, guardianshipId)

    if (result.success) {
      setGuardianSuccess('Guardian removed successfully')
      // Refetch guardians to update local state
      await refetchGuardians()
    } else {
      setGuardianError(result.error || 'Failed to remove guardian')
    }

    setGuardianLoadingId(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const scoutData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      patrol_id: selectedPatrolId || null,
      rank: (formData.get('rank') as string) || null,
      date_of_birth: dateOfBirth || null,
      bsa_member_id: (formData.get('bsa_member_id') as string) || null,
      is_active: formData.get('is_active') === 'on',
    }

    try {
      if (scout) {
        const { error: updateError } = await (supabase as unknown as {
          from: (table: string) => {
            update: (data: typeof scoutData) => {
              eq: (col: string, val: string) => Promise<{ error: Error | null }>
            }
          }
        })
          .from('scouts')
          .update(scoutData)
          .eq('id', scout.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await (supabase as unknown as {
          from: (table: string) => {
            insert: (data: typeof scoutData & { unit_id: string }) => Promise<{ error: Error | null }>
          }
        })
          .from('scouts')
          .insert({ ...scoutData, unit_id: unitId })

        if (insertError) throw insertError
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {scout ? 'Edit Scout' : 'Add New Scout'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                required
                defaultValue={scout?.first_name || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                name="last_name"
                required
                defaultValue={scout?.last_name || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patrol">Patrol</Label>
              <select
                id="patrol"
                name="patrol_id"
                value={selectedPatrolId}
                onChange={(e) => setSelectedPatrolId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No patrol</option>
                {patrols.map((patrol) => (
                  <option key={patrol.id} value={patrol.id}>
                    {patrol.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank">Rank</Label>
              <select
                id="rank"
                name="rank"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={scout?.rank || ''}
              >
                <option value="">Select rank...</option>
                {SCOUT_RANKS.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Day</option>
                {days.map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-60"
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bsa_member_id">BSA Member ID</Label>
            <Input
              id="bsa_member_id"
              name="bsa_member_id"
              defaultValue={scout?.bsa_member_id || ''}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={scout?.is_active ?? true}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active">Active Scout</Label>
          </div>

          {/* Guardian Management - only shown when editing */}
          {scout && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Guardians</Label>
                {guardiansLoaded && filteredAvailableMembers.length > 0 && !isAddingGuardian && (
                  <button
                    type="button"
                    onClick={() => setIsAddingGuardian(true)}
                    className="text-sm text-forest-600 hover:text-forest-800"
                  >
                    Add Guardian
                  </button>
                )}
              </div>

              {!guardiansLoaded && (
                <p className="text-sm text-stone-500">Loading guardians...</p>
              )}

              {guardiansLoaded && guardianError && (
                <div className="rounded-md bg-error-light p-2 text-sm text-error">
                  {guardianError}
                </div>
              )}

              {guardiansLoaded && guardianSuccess && (
                <div className="rounded-md bg-success-light p-2 text-sm text-success">
                  {guardianSuccess}
                </div>
              )}

              {/* Add Guardian Form */}
              {guardiansLoaded && isAddingGuardian && (
                <div className="rounded-lg border border-dashed border-stone-300 p-3">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selectedProfileId}
                      onChange={(e) => setSelectedProfileId(e.target.value)}
                      className="flex-1 min-w-0 rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
                    >
                      <option value="">Select member...</option>
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
                      className="rounded-md border border-stone-300 px-2 py-1.5 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Guardian</option>
                      <option value="grandparent">Grandparent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddGuardian}
                      disabled={!selectedProfileId || guardianLoadingId === 'add'}
                    >
                      {guardianLoadingId === 'add' ? 'Adding...' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingGuardian(false)
                        setSelectedProfileId('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Guardian List */}
              {guardiansLoaded && guardians.length > 0 ? (
                <div className="space-y-2">
                  {guardians.map((guardian) => {
                    const guardianName = getGuardianName(guardian)
                    return (
                      <div
                        key={guardian.id}
                        className="flex items-center justify-between rounded-lg border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-900 text-sm truncate">
                              {guardianName}
                            </span>
                            {guardian.is_primary && (
                              <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="capitalize">{guardian.relationship || 'Guardian'}</span>
                            {guardian.profiles.email && (
                              <>
                                <span>·</span>
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{guardian.profiles.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGuardian(guardian.id, guardianName)}
                          disabled={guardianLoadingId === guardian.id}
                          className="ml-2 text-xs text-error hover:text-error/80 disabled:opacity-50"
                        >
                          {guardianLoadingId === guardian.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : guardiansLoaded ? (
                <p className="text-sm text-stone-500">No guardians linked</p>
              ) : null}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : scout ? 'Update Scout' : 'Add Scout'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
