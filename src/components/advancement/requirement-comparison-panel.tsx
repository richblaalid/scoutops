'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, HelpCircle, ArrowRight, Loader2 } from 'lucide-react'
import { getMeritBadgeRequirementsForVersion } from '@/app/actions/advancement'

interface Requirement {
  id: string
  requirement_number: string
  scoutbook_requirement_number: string | null
  description: string
  display_order: number
  parent_requirement_id: string | null
  nesting_depth: number | null
}

interface CompletedRequirement {
  requirement_id?: string
  requirement_number?: string
  status: string
}

interface RequirementMapping {
  sourceReqNumber: string
  targetReqId: string | null
  targetReqNumber: string | null
  confidence: 'exact' | 'likely' | 'manual' | 'none'
  sourceDescription: string
  targetDescription: string | null
}

interface RequirementComparisonPanelProps {
  meritBadgeId: string
  currentVersionYear: number
  targetVersionYear: number
  completedRequirements: CompletedRequirement[]
  onMappingChange?: (mappings: RequirementMapping[]) => void
}

/**
 * Side-by-side comparison of requirements between two versions.
 * Shows completed requirements from current version and their mappings to target version.
 */
export function RequirementComparisonPanel({
  meritBadgeId,
  currentVersionYear,
  targetVersionYear,
  completedRequirements,
  onMappingChange,
}: RequirementComparisonPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [currentReqs, setCurrentReqs] = useState<Requirement[]>([])
  const [targetReqs, setTargetReqs] = useState<Requirement[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch requirements for both versions
  useEffect(() => {
    startTransition(async () => {
      try {
        const [currentResult, targetResult] = await Promise.all([
          getMeritBadgeRequirementsForVersion(meritBadgeId, currentVersionYear),
          getMeritBadgeRequirementsForVersion(meritBadgeId, targetVersionYear),
        ])

        if (currentResult.success && currentResult.data) {
          setCurrentReqs(currentResult.data)
        } else {
          setError(currentResult.error || 'Failed to fetch current requirements')
        }

        if (targetResult.success && targetResult.data) {
          setTargetReqs(targetResult.data)
        } else {
          setError(targetResult.error || 'Failed to fetch target requirements')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch requirements')
      }
    })
  }, [meritBadgeId, currentVersionYear, targetVersionYear])

  // Get only completed requirement numbers
  const completedReqNumbers = useMemo(() => {
    return new Set(
      completedRequirements
        .filter(r => r.status === 'completed')
        .map(r => r.requirement_number)
        .filter(Boolean)
    )
  }, [completedRequirements])

  // Auto-map requirements based on requirement number matching
  const mappings = useMemo((): RequirementMapping[] => {
    const results: RequirementMapping[] = []

    // Only map completed requirements
    const completedCurrentReqs = currentReqs.filter(r => completedReqNumbers.has(r.requirement_number))

    for (const currentReq of completedCurrentReqs) {
      // Try exact match by requirement number
      let targetReq = targetReqs.find(
        t => t.requirement_number === currentReq.requirement_number
      )
      let confidence: RequirementMapping['confidence'] = 'exact'

      // If no exact match, try scoutbook format
      if (!targetReq && currentReq.scoutbook_requirement_number) {
        targetReq = targetReqs.find(
          t => t.scoutbook_requirement_number === currentReq.scoutbook_requirement_number
        )
        if (targetReq) confidence = 'exact'
      }

      // If still no match, try fuzzy matching by description similarity
      if (!targetReq) {
        const descWords = new Set(currentReq.description.toLowerCase().split(/\s+/))
        let bestMatch: Requirement | null = null
        let bestScore = 0

        for (const t of targetReqs) {
          const targetWords = new Set(t.description.toLowerCase().split(/\s+/))
          // Calculate Jaccard similarity
          const intersection = [...descWords].filter(w => targetWords.has(w)).length
          const union = new Set([...descWords, ...targetWords]).size
          const score = intersection / union

          if (score > bestScore && score > 0.5) {
            bestScore = score
            bestMatch = t
          }
        }

        if (bestMatch) {
          targetReq = bestMatch
          confidence = 'likely'
        }
      }

      results.push({
        sourceReqNumber: currentReq.requirement_number,
        targetReqId: targetReq?.id || null,
        targetReqNumber: targetReq?.requirement_number || null,
        confidence: targetReq ? confidence : 'none',
        sourceDescription: currentReq.description,
        targetDescription: targetReq?.description || null,
      })
    }

    return results
  }, [currentReqs, targetReqs, completedReqNumbers])

  // Notify parent of mapping changes
  useEffect(() => {
    if (onMappingChange && mappings.length > 0) {
      onMappingChange(mappings)
    }
  }, [mappings, onMappingChange])

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-500">Loading requirements...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (mappings.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-stone-500">
        No completed requirements to map.
      </div>
    )
  }

  const exactMatches = mappings.filter(m => m.confidence === 'exact').length
  const likelyMatches = mappings.filter(m => m.confidence === 'likely').length
  const noMatches = mappings.filter(m => m.confidence === 'none').length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-stone-600">{exactMatches} exact match{exactMatches !== 1 ? 'es' : ''}</span>
        </div>
        {likelyMatches > 0 && (
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span className="text-stone-600">{likelyMatches} likely match{likelyMatches !== 1 ? 'es' : ''}</span>
          </div>
        )}
        {noMatches > 0 && (
          <div className="flex items-center gap-1.5">
            <X className="h-4 w-4 text-red-500" />
            <span className="text-stone-600">{noMatches} unmatched</span>
          </div>
        )}
      </div>

      {/* Mapping List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {mappings.map((mapping) => (
          <div
            key={mapping.sourceReqNumber}
            className={cn(
              'rounded-lg border p-3',
              mapping.confidence === 'exact' && 'border-green-200 bg-green-50',
              mapping.confidence === 'likely' && 'border-amber-200 bg-amber-50',
              mapping.confidence === 'none' && 'border-red-200 bg-red-50'
            )}
          >
            <div className="flex items-start gap-2">
              {/* Current Version */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-stone-700">
                    {mapping.sourceReqNumber}
                  </span>
                  <span className="text-xs text-stone-400">({currentVersionYear})</span>
                </div>
                <p className="mt-0.5 text-xs text-stone-600 line-clamp-2">
                  {mapping.sourceDescription}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className={cn(
                'h-4 w-4 flex-shrink-0 mt-1',
                mapping.confidence === 'exact' && 'text-green-500',
                mapping.confidence === 'likely' && 'text-amber-500',
                mapping.confidence === 'none' && 'text-red-400'
              )} />

              {/* Target Version */}
              <div className="flex-1 min-w-0">
                {mapping.targetReqNumber ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-stone-700">
                        {mapping.targetReqNumber}
                      </span>
                      <span className="text-xs text-stone-400">({targetVersionYear})</span>
                      {mapping.confidence === 'exact' && (
                        <Check className="h-3 w-3 text-green-600" />
                      )}
                      {mapping.confidence === 'likely' && (
                        <HelpCircle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-600 line-clamp-2">
                      {mapping.targetDescription}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <X className="h-3 w-3" />
                    No match found
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { RequirementMapping }
