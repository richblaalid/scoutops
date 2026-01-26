'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertCircle,
  Award,
  Medal,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  UserPlus,
  User,
  Users,
} from 'lucide-react'
import type { StagedTroopAdvancement, StagedScoutAdvancement } from '@/lib/import/troop-advancement-types'

interface TroopAdvancementPreviewProps {
  staged: StagedTroopAdvancement
  onImport: (selectedBsaMemberIds: string[], createUnmatchedScouts: boolean) => void
  onCancel: () => void
  isImporting: boolean
}

export function TroopAdvancementPreview({
  staged,
  onImport,
  onCancel,
  isImporting,
}: TroopAdvancementPreviewProps) {
  // Selection state
  const [selectedScouts, setSelectedScouts] = useState<Set<string>>(() => {
    // Default: select all matched scouts, and unmatched scouts with data
    return new Set(
      staged.scouts
        .filter((s) => s.matchStatus === 'matched' || s.summary.newItems > 0)
        .map((s) => s.bsaMemberId)
    )
  })
  const [createUnmatchedScouts, setCreateUnmatchedScouts] = useState(true)
  const [expandedScouts, setExpandedScouts] = useState<Set<string>>(new Set())

  // Computed values
  const selectedCount = selectedScouts.size
  const matchedSelected = staged.scouts.filter(
    (s) => s.matchStatus === 'matched' && selectedScouts.has(s.bsaMemberId)
  ).length
  const unmatchedSelected = staged.scouts.filter(
    (s) => s.matchStatus === 'unmatched' && selectedScouts.has(s.bsaMemberId)
  ).length

  const totalNewItems = useMemo(() => {
    return staged.scouts
      .filter((s) => selectedScouts.has(s.bsaMemberId))
      .reduce((sum, s) => sum + s.summary.newItems, 0)
  }, [staged.scouts, selectedScouts])

  const toggleScout = (bsaMemberId: string) => {
    const newSet = new Set(selectedScouts)
    if (newSet.has(bsaMemberId)) {
      newSet.delete(bsaMemberId)
    } else {
      newSet.add(bsaMemberId)
    }
    setSelectedScouts(newSet)
  }

  const toggleExpanded = (bsaMemberId: string) => {
    const newSet = new Set(expandedScouts)
    if (newSet.has(bsaMemberId)) {
      newSet.delete(bsaMemberId)
    } else {
      newSet.add(bsaMemberId)
    }
    setExpandedScouts(newSet)
  }

  const selectAll = () => {
    setSelectedScouts(new Set(staged.scouts.map((s) => s.bsaMemberId)))
  }

  const selectNone = () => {
    setSelectedScouts(new Set())
  }

  const selectMatched = () => {
    setSelectedScouts(
      new Set(staged.scouts.filter((s) => s.matchStatus === 'matched').map((s) => s.bsaMemberId))
    )
  }

  const handleImport = () => {
    onImport(Array.from(selectedScouts), createUnmatchedScouts)
  }

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {(staged.errors.length > 0 || staged.warnings.length > 0) && (
        <Card className="border-warning bg-warning-light">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-warning">
              {staged.errors.map((error, i) => (
                <li key={`error-${i}`}>{error}</li>
              ))}
              {staged.warnings.map((warning, i) => (
                <li key={`warning-${i}`}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scouts</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-400" />
              {staged.summary.totalScouts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              {staged.summary.matchedScouts} matched, {staged.summary.unmatchedScouts} new
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ranks</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-stone-400" />
              {staged.summary.newRanks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              + {staged.summary.newRankRequirements} requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Merit Badges</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-stone-400" />
              {staged.summary.newMeritBadges}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">
              + {staged.summary.newMeritBadgeRequirements} requirements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duplicates</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-stone-400" />
              {staged.summary.duplicates}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500">Will be skipped</p>
          </CardContent>
        </Card>
      </div>

      {/* Scout Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Select Scouts to Import</CardTitle>
            <CardDescription>
              {selectedCount} of {staged.scouts.length} scouts selected ({totalNewItems} new items)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              All
            </Button>
            <Button variant="outline" size="sm" onClick={selectMatched}>
              Matched Only
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              None
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create unmatched scouts option */}
          {staged.summary.unmatchedScouts > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
              <Checkbox
                id="create-unmatched"
                checked={createUnmatchedScouts}
                onCheckedChange={(checked) => setCreateUnmatchedScouts(!!checked)}
              />
              <label htmlFor="create-unmatched" className="flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4 text-stone-500" />
                Create new scout records for {staged.summary.unmatchedScouts} unmatched BSA IDs
              </label>
            </div>
          )}

          {/* Scout list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {staged.scouts.map((scout) => (
              <ScoutRow
                key={scout.bsaMemberId}
                scout={scout}
                isSelected={selectedScouts.has(scout.bsaMemberId)}
                isExpanded={expandedScouts.has(scout.bsaMemberId)}
                onToggleSelect={() => toggleScout(scout.bsaMemberId)}
                onToggleExpand={() => toggleExpanded(scout.bsaMemberId)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={isImporting || selectedCount === 0 || (unmatchedSelected > 0 && !createUnmatchedScouts && matchedSelected === 0)}
        >
          {isImporting ? 'Importing...' : `Import ${totalNewItems} Items`}
        </Button>
      </div>
    </div>
  )
}

// Scout row component
interface ScoutRowProps {
  scout: StagedScoutAdvancement
  isSelected: boolean
  isExpanded: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
}

function ScoutRow({
  scout,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}: ScoutRowProps) {
  const hasDetails = scout.ranks.length + scout.meritBadges.length > 0

  return (
    <div className="rounded-lg border border-stone-200">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
          <div className="flex items-center gap-2">
            {scout.matchStatus === 'matched' ? (
              <User className="h-4 w-4 text-forest-600" />
            ) : (
              <UserPlus className="h-4 w-4 text-amber-500" />
            )}
            <span className="font-medium">{scout.fullName}</span>
            {scout.matchStatus === 'unmatched' && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                New
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-stone-500">
            {scout.summary.newItems > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {scout.summary.newItems} new
              </span>
            )}
            {scout.summary.duplicates > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-stone-400" />
                {scout.summary.duplicates} dup
              </span>
            )}
          </div>
          {hasDetails && (
            <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      </div>

      {hasDetails && isExpanded && (
        <div className="border-t border-stone-200 bg-stone-50 p-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {scout.ranks.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Ranks</p>
                <div className="space-y-1">
                  {scout.ranks.map((rank, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <StatusBadge status={rank.status} />
                      <span>{rank.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {scout.meritBadges.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Merit Badges</p>
                <div className="space-y-1">
                  {scout.meritBadges.map((badge, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <StatusBadge status={badge.status} />
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(scout.rankRequirements.length > 0 || scout.meritBadgeRequirements.length > 0) && (
            <p className="mt-2 text-xs text-stone-500">
              + {scout.rankRequirements.length} rank requirements,{' '}
              {scout.meritBadgeRequirements.length} merit badge requirements
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'new' | 'duplicate' | 'update' }) {
  switch (status) {
    case 'new':
      return (
        <Badge className="bg-green-100 text-green-700 text-xs px-1.5">
          <CheckCircle className="mr-1 h-3 w-3" />
          New
        </Badge>
      )
    case 'duplicate':
      return (
        <Badge variant="outline" className="text-stone-500 text-xs px-1.5">
          <Clock className="mr-1 h-3 w-3" />
          Exists
        </Badge>
      )
    case 'update':
      return (
        <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5">
          Update
        </Badge>
      )
  }
}
