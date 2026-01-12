'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Patrol {
  id: string
  name: string
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

interface ScoutFormProps {
  unitId: string
  scout?: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    patrol_id: string | null
    rank: string | null
    date_of_birth: string | null
    bsa_member_id: string | null
    is_active: boolean | null
  }
  onClose: () => void
  onSuccess: () => void
}

const RANKS = [
  'Scout',
  'Tenderfoot',
  'Second Class',
  'First Class',
  'Star',
  'Life',
  'Eagle',
]

function parseDateParts(dateStr: string | null | undefined) {
  if (!dateStr) return { year: '', month: '', day: '' }
  const [year, month, day] = dateStr.split('-')
  return { year: year || '', month: month || '', day: day || '' }
}

export function ScoutForm({ unitId, scout, onClose, onSuccess }: ScoutFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patrols, setPatrols] = useState<Patrol[]>([])
  const [selectedPatrolId, setSelectedPatrolId] = useState<string>(scout?.patrol_id || '')

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    // Get patrol name for the selected patrol (for backwards compatibility)
    const selectedPatrol = patrols.find(p => p.id === selectedPatrolId)

    const scoutData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      patrol_id: selectedPatrolId || null,
      patrol: selectedPatrol?.name || null, // Keep text field in sync for backwards compatibility
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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
                {RANKS.map((rank) => (
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
