'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Users, UserCheck } from 'lucide-react'
import { type ParsedRoster, type ParsedAdult, type ParsedScout, deriveRole } from '@/lib/import/bsa-roster-parser'

interface RosterPreviewProps {
  roster: ParsedRoster
  onImport: (adults: ParsedAdult[], scouts: ParsedScout[]) => void
  onCancel: () => void
  isImporting: boolean
}

export function RosterPreview({ roster, onImport, onCancel, isImporting }: RosterPreviewProps) {
  const [selectedAdults, setSelectedAdults] = useState<Set<number>>(
    new Set(roster.adults.map((_, i) => i))
  )
  const [selectedScouts, setSelectedScouts] = useState<Set<number>>(
    new Set(roster.scouts.map((_, i) => i))
  )

  const toggleAdult = (index: number) => {
    const newSet = new Set(selectedAdults)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedAdults(newSet)
  }

  const toggleScout = (index: number) => {
    const newSet = new Set(selectedScouts)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedScouts(newSet)
  }

  const selectAllAdults = () => {
    setSelectedAdults(new Set(roster.adults.map((_, i) => i)))
  }

  const selectAllScouts = () => {
    setSelectedScouts(new Set(roster.scouts.map((_, i) => i)))
  }

  const deselectAllAdults = () => {
    setSelectedAdults(new Set())
  }

  const deselectAllScouts = () => {
    setSelectedScouts(new Set())
  }

  const handleImport = () => {
    const adultsToImport = roster.adults.filter((_, i) => selectedAdults.has(i))
    const scoutsToImport = roster.scouts.filter((_, i) => selectedScouts.has(i))
    onImport(adultsToImport, scoutsToImport)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'treasurer': return 'bg-blue-100 text-blue-700'
      case 'leader': return 'bg-green-100 text-green-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {roster.errors.length > 0 && (
        <Card className="border-warning bg-warning-light">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-warning">
              {roster.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Adults Found</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-400" />
              {roster.adults.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {selectedAdults.size} selected for import
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scouts Found</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-stone-400" />
              {roster.scouts.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {selectedScouts.size} selected for import
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview Tabs */}
      <Tabs defaultValue="adults" className="w-full">
        <TabsList>
          <TabsTrigger value="adults">Adults ({roster.adults.length})</TabsTrigger>
          <TabsTrigger value="scouts">Scouts ({roster.scouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="adults" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Adult Members</CardTitle>
                <CardDescription>Leaders, parents, and committee members</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAdults}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllAdults}>
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-stone-500">
                      <th className="pb-2 pr-4 w-10"></th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Role</th>
                      <th className="pb-2 pr-4">Position</th>
                      <th className="pb-2 pr-4">Trainings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.adults.map((adult, index) => {
                      const role = deriveRole(adult.positions)
                      return (
                        <tr key={index} className="border-b border-stone-100">
                          <td className="py-2 pr-4">
                            <Checkbox
                              checked={selectedAdults.has(index)}
                              onCheckedChange={() => toggleAdult(index)}
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium">
                            {adult.firstName} {adult.lastName}
                          </td>
                          <td className="py-2 pr-4 text-stone-600">
                            {adult.email || '—'}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge className={getRoleBadgeColor(role)}>{role}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-stone-600">
                            {adult.positions[0] || '—'}
                          </td>
                          <td className="py-2 pr-4 text-stone-500">
                            {adult.trainings.length} trainings
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scouts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Youth Members</CardTitle>
                <CardDescription>Scouts with linked guardians</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllScouts}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllScouts}>
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-stone-500">
                      <th className="pb-2 pr-4 w-10"></th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Rank</th>
                      <th className="pb-2 pr-4">Patrol</th>
                      <th className="pb-2 pr-4">BSA ID</th>
                      <th className="pb-2 pr-4">Guardian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.scouts.map((scout, index) => (
                      <tr key={index} className="border-b border-stone-100">
                        <td className="py-2 pr-4">
                          <Checkbox
                            checked={selectedScouts.has(index)}
                            onCheckedChange={() => toggleScout(index)}
                          />
                        </td>
                        <td className="py-2 pr-4 font-medium">
                          {scout.firstName} {scout.lastName}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline">{scout.rank || 'Unranked'}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-stone-600">
                          {scout.patrol || '—'}
                        </td>
                        <td className="py-2 pr-4 text-stone-500">
                          {scout.bsaMemberId || '—'}
                        </td>
                        <td className="py-2 pr-4 text-stone-600">
                          {scout.guardians[0]?.name || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || (selectedAdults.size === 0 && selectedScouts.size === 0)}
        >
          {isImporting ? 'Importing...' : `Import ${selectedAdults.size + selectedScouts.size} Records`}
        </Button>
      </div>
    </div>
  )
}
