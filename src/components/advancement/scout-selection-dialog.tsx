'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, User, Users, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Scout {
  id: string
  first_name: string
  last_name: string
  is_active: boolean | null
}

interface SelectedRequirement {
  id: string
  requirementNumber: string
  description: string
}

interface ScoutSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string // e.g., "First Aid" or "Tenderfoot"
  type: 'merit-badge' | 'rank'
  scouts: Scout[]
  selectedRequirements: SelectedRequirement[]
  /** Set of scout IDs who have completed ALL selected requirements (to exclude) */
  scoutsWithAllComplete: Set<string>
  /** Map of scout ID → Set of requirement IDs they've already completed */
  scoutCompletedRequirements: Map<string, Set<string>>
  onConfirm: (scoutIds: string[], date: string) => Promise<void>
  isLoading?: boolean
}

export function ScoutSelectionDialog({
  open,
  onOpenChange,
  title,
  type,
  scouts,
  selectedRequirements,
  scoutsWithAllComplete,
  scoutCompletedRequirements,
  onConfirm,
  isLoading = false,
}: ScoutSelectionDialogProps) {
  const [selectedScoutIds, setSelectedScoutIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // Filter scouts: show those who don't have ALL requirements complete
  const eligibleScouts = useMemo(() => {
    return scouts
      .filter(scout => scout.is_active !== false)
      .filter(scout => !scoutsWithAllComplete.has(scout.id))
      .sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      )
  }, [scouts, scoutsWithAllComplete])

  // Apply search filter
  const filteredScouts = useMemo(() => {
    if (!searchQuery) return eligibleScouts
    const query = searchQuery.toLowerCase()
    return eligibleScouts.filter(scout =>
      `${scout.first_name} ${scout.last_name}`.toLowerCase().includes(query)
    )
  }, [eligibleScouts, searchQuery])

  const handleScoutToggle = (scoutId: string) => {
    setSelectedScoutIds(prev => {
      const next = new Set(prev)
      if (next.has(scoutId)) {
        next.delete(scoutId)
      } else {
        next.add(scoutId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedScoutIds(new Set(filteredScouts.map(s => s.id)))
  }

  const handleClearAll = () => {
    setSelectedScoutIds(new Set())
  }

  const handleConfirm = async () => {
    if (selectedScoutIds.size === 0) return
    await onConfirm(Array.from(selectedScoutIds), completionDate)
    // Reset state on success
    setSelectedScoutIds(new Set())
    setSearchQuery('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedScoutIds(new Set())
      setSearchQuery('')
    }
    onOpenChange(newOpen)
  }

  // Count how many new requirement completions will be created
  const totalNewCompletions = useMemo(() => {
    let count = 0
    selectedScoutIds.forEach(scoutId => {
      const completed = scoutCompletedRequirements.get(scoutId) || new Set()
      selectedRequirements.forEach(req => {
        if (!completed.has(req.id)) {
          count++
        }
      })
    })
    return count
  }, [selectedScoutIds, selectedRequirements, scoutCompletedRequirements])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-forest-600" />
            Sign Off Requirements
          </DialogTitle>
          <DialogDescription>
            Select which scouts completed the following {title} {type === 'merit-badge' ? 'badge' : ''} requirements
          </DialogDescription>
        </DialogHeader>

        {/* Selected Requirements Summary */}
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
            {selectedRequirements.length} Requirement{selectedRequirements.length !== 1 ? 's' : ''} Selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedRequirements.slice(0, 5).map(req => (
              <Badge key={req.id} variant="secondary" className="text-xs">
                {req.requirementNumber}
              </Badge>
            ))}
            {selectedRequirements.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{selectedRequirements.length - 5} more
              </Badge>
            )}
          </div>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <Label htmlFor="completion-date" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Calendar className="h-4 w-4 text-stone-500" />
            Completion Date
          </Label>
          <Input
            id="completion-date"
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="w-auto"
          />
        </div>

        {/* Search and Select All */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              placeholder="Search scouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={selectedScoutIds.size === filteredScouts.length ? handleClearAll : handleSelectAll}
          >
            {selectedScoutIds.size === filteredScouts.length ? 'Clear All' : 'Select All'}
          </Button>
        </div>

        {/* Scout List */}
        <ScrollArea className="h-64 rounded-lg border">
          <div className="p-2 space-y-1">
            {filteredScouts.length > 0 ? (
              filteredScouts.map(scout => {
                const isSelected = selectedScoutIds.has(scout.id)
                const completedReqs = scoutCompletedRequirements.get(scout.id) || new Set()
                const alreadyCompletedCount = selectedRequirements.filter(
                  r => completedReqs.has(r.id)
                ).length
                const willComplete = selectedRequirements.length - alreadyCompletedCount

                return (
                  <button
                    key={scout.id}
                    onClick={() => handleScoutToggle(scout.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors',
                      isSelected
                        ? 'bg-forest-50 border border-forest-200'
                        : 'hover:bg-stone-50 border border-transparent'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleScoutToggle(scout.id)}
                      className="pointer-events-none"
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100">
                      <User className="h-4 w-4 text-stone-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 truncate">
                        {scout.first_name} {scout.last_name}
                      </p>
                      {alreadyCompletedCount > 0 && (
                        <p className="text-xs text-stone-500">
                          {alreadyCompletedCount} already done, {willComplete} new
                        </p>
                      )}
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="py-8 text-center text-stone-500">
                {searchQuery
                  ? 'No scouts match your search'
                  : 'All scouts have completed these requirements'}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex-1 text-sm text-stone-500">
            {selectedScoutIds.size > 0 && (
              <span>
                {selectedScoutIds.size} scout{selectedScoutIds.size !== 1 ? 's' : ''} selected
                {totalNewCompletions > 0 && ` • ${totalNewCompletions} new completion${totalNewCompletions !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedScoutIds.size === 0 || isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign Off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
