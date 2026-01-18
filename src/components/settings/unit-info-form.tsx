'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UnitInfoFormProps {
  unitId: string
  name: string
  unitNumber: string
  unitType: string
  council: string | null
  district: string | null
  charteredOrg: string | null
}

const UNIT_TYPES = [
  { value: 'troop', label: 'Troop' },
  { value: 'pack', label: 'Pack' },
  { value: 'crew', label: 'Crew' },
  { value: 'ship', label: 'Ship' },
]

export function UnitInfoForm({
  unitId,
  name: initialName,
  unitNumber: initialUnitNumber,
  unitType: initialUnitType,
  council: initialCouncil,
  district: initialDistrict,
  charteredOrg: initialCharteredOrg,
}: UnitInfoFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [name, setName] = useState(initialName)
  const [unitNumber, setUnitNumber] = useState(initialUnitNumber)
  const [unitType, setUnitType] = useState(initialUnitType)
  const [council, setCouncil] = useState(initialCouncil || '')
  const [district, setDistrict] = useState(initialDistrict || '')
  const [charteredOrg, setCharteredOrg] = useState(initialCharteredOrg || '')

  const hasChanges =
    name !== initialName ||
    unitNumber !== initialUnitNumber ||
    unitType !== initialUnitType ||
    council !== (initialCouncil || '') ||
    district !== (initialDistrict || '') ||
    charteredOrg !== (initialCharteredOrg || '')

  function handleCancel() {
    setName(initialName)
    setUnitNumber(initialUnitNumber)
    setUnitType(initialUnitType)
    setCouncil(initialCouncil || '')
    setDistrict(initialDistrict || '')
    setCharteredOrg(initialCharteredOrg || '')
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    if (!name.trim() || !unitNumber.trim()) {
      setError('Unit name and number are required')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('units')
        .update({
          name: name.trim(),
          unit_number: unitNumber.trim(),
          unit_type: unitType as 'troop' | 'pack' | 'crew' | 'ship',
          council: council.trim() || null,
          district: district.trim() || null,
          chartered_org: charteredOrg.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', unitId)

      if (updateError) throw updateError

      setSuccess(true)
      setIsEditing(false)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Unit Information</CardTitle>
            <CardDescription>
              Basic information about your scout unit
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Unit Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="Troop 123"
              className={!isEditing ? 'bg-stone-50' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitNumber">Unit Number</Label>
            <Input
              id="unitNumber"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="123"
              className={!isEditing ? 'bg-stone-50' : ''}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitType">Unit Type</Label>
          <Select
            value={unitType}
            onValueChange={setUnitType}
            disabled={!isEditing || isLoading}
          >
            <SelectTrigger className={!isEditing ? 'bg-stone-50' : ''}>
              <SelectValue placeholder="Select unit type" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="council">Council</Label>
            <Input
              id="council"
              value={council}
              onChange={(e) => setCouncil(e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="Greater Los Angeles Area Council"
              className={!isEditing ? 'bg-stone-50' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!isEditing || isLoading}
              placeholder="San Fernando Valley"
              className={!isEditing ? 'bg-stone-50' : ''}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="charteredOrg">Chartered Organization</Label>
          <Input
            id="charteredOrg"
            value={charteredOrg}
            onChange={(e) => setCharteredOrg(e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="First United Methodist Church"
            className={!isEditing ? 'bg-stone-50' : ''}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            Unit information saved successfully
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              loading={isLoading}
              loadingText="Saving..."
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
