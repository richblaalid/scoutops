'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, AlertCircle, Check } from 'lucide-react'
import { setupTroopSections, removeTroopSections } from '@/app/actions/unit-sections'

type TroopType = 'boys' | 'girls' | 'both'

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface TroopStructureFormProps {
  unitId: string
  unitName: string
  unitNumber: string
  unitType: string
  unitGender: 'boys' | 'girls' | 'coed' | null
  sections: Section[]
}

export function TroopStructureForm({
  unitId,
  unitName,
  unitNumber,
  unitType,
  unitGender,
  sections,
}: TroopStructureFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Determine current structure
  const hasSections = sections.length > 0
  const boysSection = sections.find(s => s.unit_gender === 'boys')
  const girlsSection = sections.find(s => s.unit_gender === 'girls')

  // Determine initial troop type
  const getInitialTroopType = (): TroopType => {
    if (hasSections) return 'both'
    if (unitGender === 'boys') return 'boys'
    if (unitGender === 'girls') return 'girls'
    return 'boys' // Default
  }

  const [troopType, setTroopType] = useState<TroopType>(getInitialTroopType())
  const [boysNumber, setBoysNumber] = useState(boysSection?.unit_number || unitNumber)
  const [girlsNumber, setGirlsNumber] = useState(girlsSection?.unit_number || '')

  // Calculate base number from troop numbers
  const calculateBaseNumber = () => {
    const boys = boysNumber.replace(/^9/, '')
    const girls = girlsNumber.replace(/^7/, '')
    if (boys === girls && boys) return boys
    return boys || girls || unitNumber
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    if (troopType === 'both') {
      if (!boysNumber || !girlsNumber) {
        setError('Please enter both troop numbers')
        setIsSubmitting(false)
        return
      }

      const result = await setupTroopSections({
        unitId,
        boysNumber,
        girlsNumber,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess('Troop sections created successfully')
        router.refresh()
      }
    } else {
      // If changing from 'both' to single-gender, remove sections
      if (hasSections) {
        const result = await removeTroopSections(unitId, troopType)
        if (result.error) {
          setError(result.error)
        } else {
          setSuccess('Troop structure updated')
          router.refresh()
        }
      }
    }

    setIsSubmitting(false)
  }

  const hasChanges = () => {
    const currentType = getInitialTroopType()
    if (troopType !== currentType) return true
    if (troopType === 'both') {
      if (boysNumber !== (boysSection?.unit_number || unitNumber)) return true
      if (girlsNumber !== (girlsSection?.unit_number || '')) return true
    }
    return false
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Troop Structure
        </CardTitle>
        <CardDescription>
          Configure how your troop is organized. Linked troops (boys and girls) share
          leaders and committee but track scouts separately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-600">
            <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {success}
          </div>
        )}

        <RadioGroup
          value={troopType}
          onValueChange={(v) => setTroopType(v as TroopType)}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3 rounded-md border p-4 cursor-pointer hover:bg-stone-50"
               onClick={() => setTroopType('boys')}>
            <RadioGroupItem value="boys" id="boys" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="boys" className="cursor-pointer font-medium">
                Boys Troop Only
              </Label>
              <p className="text-sm text-muted-foreground">
                A single-gender troop for boys
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md border p-4 cursor-pointer hover:bg-stone-50"
               onClick={() => setTroopType('girls')}>
            <RadioGroupItem value="girls" id="girls" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="girls" className="cursor-pointer font-medium">
                Girls Troop Only
              </Label>
              <p className="text-sm text-muted-foreground">
                A single-gender troop for girls
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md border p-4 cursor-pointer hover:bg-stone-50"
               onClick={() => setTroopType('both')}>
            <RadioGroupItem value="both" id="both" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="both" className="cursor-pointer font-medium">
                Both (Linked Boys & Girls Troops)
              </Label>
              <p className="text-sm text-muted-foreground">
                A linked troop with separate boys and girls sections sharing the same
                committee and charter
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Linked troop configuration */}
        {troopType === 'both' && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Enter the troop numbers for each section. These are typically assigned by
              your council (e.g., 9297 for boys, 7297 for girls).
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="boys-number">Boys Troop Number</Label>
                <Input
                  id="boys-number"
                  value={boysNumber}
                  onChange={(e) => setBoysNumber(e.target.value)}
                  placeholder="e.g., 9297"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="girls-number">Girls Troop Number</Label>
                <Input
                  id="girls-number"
                  value={girlsNumber}
                  onChange={(e) => setGirlsNumber(e.target.value)}
                  placeholder="e.g., 7297"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Base number display */}
            {(boysNumber || girlsNumber) && (
              <div className="rounded-md bg-stone-50 p-3">
                <p className="text-sm text-muted-foreground">
                  Base troop number: <span className="font-medium text-stone-900">{calculateBaseNumber()}</span>
                </p>
              </div>
            )}

            {/* Show existing sections */}
            {hasSections && (
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-sm font-medium">Current Sections</h4>
                <div className="space-y-2">
                  {boysSection && (
                    <div className="flex items-center justify-between rounded-md border p-3 bg-stone-50">
                      <div>
                        <span className="font-medium capitalize">
                          {unitType} {boysSection.unit_number}
                        </span>
                        <span className="ml-2 rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-700">
                          Boys
                        </span>
                      </div>
                    </div>
                  )}
                  {girlsSection && (
                    <div className="flex items-center justify-between rounded-md border p-3 bg-stone-50">
                      <div>
                        <span className="font-medium capitalize">
                          {unitType} {girlsSection.unit_number}
                        </span>
                        <span className="ml-2 rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-700">
                          Girls
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        {hasChanges() && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleSave}
              disabled={isSubmitting || (troopType === 'both' && (!boysNumber || !girlsNumber))}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTroopType(getInitialTroopType())
                setBoysNumber(boysSection?.unit_number || unitNumber)
                setGirlsNumber(girlsSection?.unit_number || '')
                setError(null)
                setSuccess(null)
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
