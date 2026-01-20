'use client'

import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { RequirementApprovalRow } from './requirement-approval-row'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import type { AdvancementStatus } from '@/types/advancement'

interface Requirement {
  id: string
  requirementProgressId: string | null // Can be null for unstarted ranks
  requirementNumber: string
  description: string
  status: AdvancementStatus
  completedAt: string | null
  completedBy: string | null
  notes: string | null
  approvalStatus: string | null
}

interface HierarchicalRequirementsListProps {
  requirements: Requirement[]
  unitId: string
  canEdit: boolean
  showSectionHeaders?: boolean
  defaultCollapseCompleted?: boolean
  // Current user name for completion dialogs
  currentUserName?: string
  // Optional data for initializing progress when marking complete on unstarted ranks
  initData?: {
    scoutId: string
    rankId: string
    versionId: string
  }
}

// Parse requirement number to extract group number and sub-letter
function parseRequirementNumber(reqNum: string): { group: number; subLetter: string | null; isParent: boolean } {
  const match = reqNum.match(/^(\d+)([a-z])?$/i)
  if (!match) {
    return { group: 0, subLetter: null, isParent: false }
  }

  const group = parseInt(match[1], 10)
  const subLetter = match[2]?.toLowerCase() || null

  return {
    group,
    subLetter,
    isParent: !subLetter, // Requirements like "1", "2" are parents; "1a", "2b" are children
  }
}

// Group requirements by their main number
function groupRequirements(requirements: Requirement[]): Map<number, { parent: Requirement | null; children: Requirement[] }> {
  const groups = new Map<number, { parent: Requirement | null; children: Requirement[] }>()

  // Sort requirements by their display order
  const sorted = [...requirements].sort((a, b) => {
    const parsedA = parseRequirementNumber(a.requirementNumber)
    const parsedB = parseRequirementNumber(b.requirementNumber)

    if (parsedA.group !== parsedB.group) {
      return parsedA.group - parsedB.group
    }

    // Parent comes before children
    if (parsedA.isParent && !parsedB.isParent) return -1
    if (!parsedA.isParent && parsedB.isParent) return 1

    // Sort children alphabetically
    return (parsedA.subLetter || '').localeCompare(parsedB.subLetter || '')
  })

  sorted.forEach(req => {
    const parsed = parseRequirementNumber(req.requirementNumber)

    if (!groups.has(parsed.group)) {
      groups.set(parsed.group, { parent: null, children: [] })
    }

    const group = groups.get(parsed.group)!

    if (parsed.isParent) {
      group.parent = req
    } else {
      group.children.push(req)
    }
  })

  return groups
}

// Calculate completion stats for a group
function getGroupStats(parent: Requirement | null, children: Requirement[]) {
  const all = parent ? [parent, ...children] : children
  const completed = all.filter(r => ['completed', 'approved', 'awarded'].includes(r.status)).length
  return { completed, total: all.length }
}

// Check if a single requirement is complete
function isRequirementComplete(req: Requirement) {
  return ['completed', 'approved', 'awarded'].includes(req.status)
}

export function HierarchicalRequirementsList({
  requirements,
  unitId,
  canEdit,
  defaultCollapseCompleted = false,
  currentUserName,
  initData,
}: HierarchicalRequirementsListProps) {
  const groupedRequirements = useMemo(() => {
    return groupRequirements(requirements)
  }, [requirements])

  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())

  // Reset collapsed state when requirements change - collapse completed groups by default
  useEffect(() => {
    if (!defaultCollapseCompleted) {
      setCollapsedGroups(new Set())
      return
    }

    const collapsed = new Set<number>()
    groupedRequirements.forEach((group, groupNum) => {
      const stats = getGroupStats(group.parent, group.children)
      if (stats.completed === stats.total) {
        collapsed.add(groupNum)
      }
    })
    setCollapsedGroups(collapsed)
  }, [groupedRequirements, defaultCollapseCompleted])

  const toggleGroup = (group: number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  if (requirements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-stone-500">
        No requirements loaded
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {Array.from(groupedRequirements.entries()).map(([groupNum, { parent, children }]) => {
        const isCollapsed = collapsedGroups.has(groupNum)
        const stats = getGroupStats(parent, children)
        const isGroupComplete = stats.completed === stats.total
        const hasChildren = children.length > 0

        // For single requirements (no children), treat the parent as the only item
        const isSingleRequirement = !hasChildren && parent !== null

        return (
          <div
            key={groupNum}
            className={cn(
              'rounded-lg border transition-colors',
              isGroupComplete
                ? 'border-emerald-200 bg-emerald-50/30'
                : 'border-stone-200 bg-stone-50/30'
            )}
          >
            {/* Collapsible Header - Always shown */}
            <button
              onClick={() => toggleGroup(groupNum)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                'hover:bg-stone-100/50',
                isCollapsed ? 'rounded-lg' : 'rounded-t-lg',
                isGroupComplete && 'hover:bg-emerald-100/50'
              )}
            >
              {/* Expand/Collapse Icon */}
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-stone-400">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>

              {/* Requirement Number Badge */}
              <span className={cn(
                'flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded px-1.5 text-xs font-bold',
                isGroupComplete
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-stone-200 text-stone-700'
              )}>
                {groupNum}
              </span>

              {/* Title */}
              <span className={cn(
                'flex-1 font-medium',
                isGroupComplete ? 'text-emerald-700' : 'text-stone-700'
              )}>
                Requirement {groupNum}
              </span>

              {/* Status Indicator */}
              {isGroupComplete ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Complete
                </span>
              ) : (
                <span className="text-xs text-stone-400">
                  {stats.completed}/{stats.total}
                </span>
              )}
            </button>

            {/* Expanded Content */}
            {!isCollapsed && (
              <div className="border-t border-stone-100 px-2 pb-2 pt-1">
                {/* Single requirement (no sub-items) */}
                {isSingleRequirement && parent && (
                  <RequirementApprovalRow
                    id={parent.id}
                    requirementProgressId={parent.requirementProgressId}
                    requirementNumber={parent.requirementNumber}
                    description={parent.description}
                    status={parent.status}
                    completedAt={parent.completedAt}
                    completedBy={parent.completedBy}
                    notes={parent.notes}
                    approvalStatus={parent.approvalStatus}
                    unitId={unitId}
                    canEdit={canEdit}
                    currentUserName={currentUserName}
                    initData={initData}
                  />
                )}

                {/* Multiple sub-requirements */}
                {hasChildren && (
                  <div className="space-y-0.5">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="ml-2 border-l-2 border-stone-200 pl-2"
                      >
                        <RequirementApprovalRow
                          id={child.id}
                          requirementProgressId={child.requirementProgressId}
                          requirementNumber={child.requirementNumber}
                          description={child.description}
                          status={child.status}
                          completedAt={child.completedAt}
                          completedBy={child.completedBy}
                          notes={child.notes}
                          approvalStatus={child.approvalStatus}
                          unitId={unitId}
                          canEdit={canEdit}
                          currentUserName={currentUserName}
                          initData={initData}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
