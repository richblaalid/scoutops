'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Award, Medal, Users, Activity, CheckCircle, Clock } from 'lucide-react'
import {
  type ParsedScoutbookHistory,
  type ParsedRankProgress,
  type ParsedMeritBadge,
  type ParsedLeadershipPosition,
  getScoutbookHistorySummary,
} from '@/lib/import/scoutbook-history-parser'

interface ScoutbookHistoryPreviewProps {
  data: ParsedScoutbookHistory
  onImport: (selections: ImportSelections) => void
  onCancel: () => void
  isImporting: boolean
}

export interface ImportSelections {
  rankProgress: ParsedRankProgress[]
  completedMeritBadges: ParsedMeritBadge[]
  partialMeritBadges: ParsedMeritBadge[]
  leadershipHistory: ParsedLeadershipPosition[]
  includeActivities: boolean
}

export function ScoutbookHistoryPreview({
  data,
  onImport,
  onCancel,
  isImporting,
}: ScoutbookHistoryPreviewProps) {
  const summary = getScoutbookHistorySummary(data)

  // Selection state for each category
  const [selectedRanks, setSelectedRanks] = useState<Set<number>>(
    new Set(data.rankProgress.map((_, i) => i))
  )
  const [selectedCompletedBadges, setSelectedCompletedBadges] = useState<Set<number>>(
    new Set(data.completedMeritBadges.map((_, i) => i))
  )
  const [selectedPartialBadges, setSelectedPartialBadges] = useState<Set<number>>(
    new Set(data.partialMeritBadges.map((_, i) => i))
  )
  const [selectedLeadership, setSelectedLeadership] = useState<Set<number>>(
    new Set(data.leadershipHistory.map((_, i) => i))
  )
  const [includeActivities, setIncludeActivities] = useState(true)

  const toggleRank = (index: number) => {
    const newSet = new Set(selectedRanks)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedRanks(newSet)
  }

  const toggleCompletedBadge = (index: number) => {
    const newSet = new Set(selectedCompletedBadges)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedCompletedBadges(newSet)
  }

  const togglePartialBadge = (index: number) => {
    const newSet = new Set(selectedPartialBadges)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedPartialBadges(newSet)
  }

  const toggleLeadership = (index: number) => {
    const newSet = new Set(selectedLeadership)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedLeadership(newSet)
  }

  const handleImport = () => {
    onImport({
      rankProgress: data.rankProgress.filter((_, i) => selectedRanks.has(i)),
      completedMeritBadges: data.completedMeritBadges.filter((_, i) => selectedCompletedBadges.has(i)),
      partialMeritBadges: data.partialMeritBadges.filter((_, i) => selectedPartialBadges.has(i)),
      leadershipHistory: data.leadershipHistory.filter((_, i) => selectedLeadership.has(i)),
      includeActivities,
    })
  }

  const totalSelected =
    selectedRanks.size +
    selectedCompletedBadges.size +
    selectedPartialBadges.size +
    selectedLeadership.size +
    (includeActivities ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {data.errors.length > 0 && (
        <Card className="border-warning bg-warning-light">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-warning">
              {data.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Scout Info */}
      <Card>
        <CardHeader>
          <CardTitle>{summary.scoutName}</CardTitle>
          <CardDescription>
            {summary.currentRank && (
              <span className="mr-2">
                Current Rank: <Badge variant="outline">{summary.currentRank}</Badge>
              </span>
            )}
            {data.scout.bsaId && <span className="text-stone-500">BSA ID: {data.scout.bsaId}</span>}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rank Progress</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-stone-400" />
              {summary.completedRanks} / {data.rankProgress.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {selectedRanks.size} selected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Merit Badges</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-stone-400" />
              {summary.completedBadges} + {summary.inProgressBadges}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {selectedCompletedBadges.size + selectedPartialBadges.size} selected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leadership</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-400" />
              {summary.leadershipPositions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {selectedLeadership.size} selected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activities</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-stone-400" />
              {summary.activities.campingNights} nights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {summary.activities.serviceHours} service hrs, {summary.activities.hikingMiles} mi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview Tabs */}
      <Tabs defaultValue="ranks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranks">Ranks ({data.rankProgress.length})</TabsTrigger>
          <TabsTrigger value="badges">
            Badges ({data.completedMeritBadges.length + data.partialMeritBadges.length})
          </TabsTrigger>
          <TabsTrigger value="leadership">Leadership ({data.leadershipHistory.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Ranks Tab */}
        <TabsContent value="ranks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rank Progress</CardTitle>
                <CardDescription>Progress through rank requirements</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRanks(new Set(data.rankProgress.map((_, i) => i)))}
                >
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedRanks(new Set())}>
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.rankProgress.map((rank, index) => {
                  const completedReqs = rank.requirements.filter((r) => r.completedDate !== null).length
                  const totalReqs = rank.requirements.length
                  const isComplete = rank.completedDate !== null

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-stone-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedRanks.has(index)}
                          onCheckedChange={() => toggleRank(index)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{rank.rankName}</span>
                            {isComplete ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="mr-1 h-3 w-3" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-stone-500">
                            {completedReqs} / {totalReqs} requirements completed
                            {rank.completedDate && ` - ${rank.completedDate}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {data.rankProgress.length === 0 && (
                  <p className="py-8 text-center text-stone-500">No rank progress found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merit Badges Tab */}
        <TabsContent value="badges" className="mt-4">
          <div className="space-y-4">
            {/* Completed Badges */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Completed Merit Badges</CardTitle>
                  <CardDescription>Badges that have been fully earned</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedCompletedBadges(new Set(data.completedMeritBadges.map((_, i) => i)))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCompletedBadges(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.completedMeritBadges.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 p-3"
                    >
                      <Checkbox
                        checked={selectedCompletedBadges.has(index)}
                        onCheckedChange={() => toggleCompletedBadge(index)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{badge.name}</p>
                        <p className="text-xs text-stone-500">{badge.completedDate}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                      </Badge>
                    </div>
                  ))}
                  {data.completedMeritBadges.length === 0 && (
                    <p className="col-span-full py-4 text-center text-stone-500">
                      No completed merit badges found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Partial Badges */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>In-Progress Merit Badges</CardTitle>
                  <CardDescription>Badges with some requirements completed</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedPartialBadges(new Set(data.partialMeritBadges.map((_, i) => i)))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPartialBadges(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.partialMeritBadges.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-stone-200 p-3"
                    >
                      <Checkbox
                        checked={selectedPartialBadges.has(index)}
                        onCheckedChange={() => togglePartialBadge(index)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{badge.name}</p>
                        <p className="text-xs text-stone-500">
                          Started {badge.startDate}
                          {badge.completedRequirements.length > 0 &&
                            ` - ${badge.completedRequirements.length} reqs done`}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3" />
                      </Badge>
                    </div>
                  ))}
                  {data.partialMeritBadges.length === 0 && (
                    <p className="col-span-full py-4 text-center text-stone-500">
                      No in-progress merit badges found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leadership Tab */}
        <TabsContent value="leadership" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leadership History</CardTitle>
                <CardDescription>Past and current leadership positions</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedLeadership(new Set(data.leadershipHistory.map((_, i) => i)))
                  }
                >
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedLeadership(new Set())}>
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-stone-500">
                      <th className="w-10 pb-2 pr-4"></th>
                      <th className="pb-2 pr-4">Position</th>
                      <th className="pb-2 pr-4">Patrol</th>
                      <th className="pb-2 pr-4">Start Date</th>
                      <th className="pb-2 pr-4">End Date</th>
                      <th className="pb-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leadershipHistory.map((position, index) => {
                      const isCurrent = position.endDate === null
                      return (
                        <tr key={index} className="border-b border-stone-100">
                          <td className="py-2 pr-4">
                            <Checkbox
                              checked={selectedLeadership.has(index)}
                              onCheckedChange={() => toggleLeadership(index)}
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium">{position.name}</td>
                          <td className="py-2 pr-4 text-stone-600">{position.patrol || '—'}</td>
                          <td className="py-2 pr-4 text-stone-600">{position.startDate || '—'}</td>
                          <td className="py-2 pr-4 text-stone-600">{position.endDate || '—'}</td>
                          <td className="py-2 pr-4">
                            <Badge className={isCurrent ? 'bg-green-100 text-green-700' : ''}>
                              {isCurrent ? 'Current' : 'Past'}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {data.leadershipHistory.length === 0 && (
                  <p className="py-8 text-center text-stone-500">No leadership history found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Totals</CardTitle>
                <CardDescription>Camping, hiking, and service hours</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeActivities}
                  onCheckedChange={(checked) => setIncludeActivities(!!checked)}
                />
                <span className="text-sm">Include activities</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{data.activities.campingNights}</p>
                  <p className="text-sm text-stone-500">Camping Nights</p>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{data.activities.serviceHours}</p>
                  <p className="text-sm text-stone-500">Service Hours</p>
                </div>
                <div className="rounded-lg border border-stone-200 p-4">
                  <p className="text-2xl font-bold">{data.activities.hikingMiles}</p>
                  <p className="text-sm text-stone-500">Hiking Miles</p>
                </div>
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
        <Button onClick={handleImport} disabled={isImporting || totalSelected === 0}>
          {isImporting ? 'Importing...' : `Import Selected Data`}
        </Button>
      </div>
    </div>
  )
}
