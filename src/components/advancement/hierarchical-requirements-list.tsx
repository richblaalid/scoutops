'use client'

import { useMemo, useState, useRef, memo, useCallback } from 'react'
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
  // New fields for alternatives support
  parentRequirementId?: string | null
  isAlternative?: boolean | null
  alternativesGroup?: string | null
  nestingDepth?: number | null
  requiredCount?: number | null
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
  }
  // Merit badge support
  isMeritBadge?: boolean
  meritBadgeInitData?: {
    scoutId: string
    meritBadgeId: string
    meritBadgeProgressId: string
  }
  // Multi-select support for bulk operations
  isMultiSelectMode?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (id: string) => void
}

// Parse requirement number to extract group number, sub-letters, and depth
// Handles: "1", "1a", "1a1", "1b8", "6A", "6A(a)(1)"
function parseRequirementNumber(reqNum: string): {
  group: number
  subParts: string[]
  depth: number
  isParent: boolean
} {
  // First try standard pattern: number + optional letter + optional number
  // Examples: "1", "1a", "1a1", "7b8"
  const standardMatch = reqNum.match(/^(\d+)([a-z])?(\d+)?$/i)
  if (standardMatch) {
    const group = parseInt(standardMatch[1], 10)
    const subParts: string[] = []
    if (standardMatch[2]) {
      subParts.push(standardMatch[2].toLowerCase())
      if (standardMatch[3]) {
        subParts.push(standardMatch[3])
      }
    }
    return {
      group,
      subParts,
      depth: 1 + subParts.length,
      isParent: subParts.length === 0,
    }
  }

  // Try parenthetical pattern: "6A(a)(1)"
  const parenMatch = reqNum.match(/^(\d+)([A-Z])?(?:\(([^)]+)\))*$/i)
  if (parenMatch) {
    const group = parseInt(parenMatch[1], 10)
    const subParts: string[] = []
    if (parenMatch[2]) {
      subParts.push(parenMatch[2].toUpperCase())
    }
    // Extract all parenthetical groups
    const parenGroups = reqNum.match(/\(([^)]+)\)/g)
    if (parenGroups) {
      parenGroups.forEach(pg => {
        const content = pg.slice(1, -1)
        subParts.push(content)
      })
    }
    return {
      group,
      subParts,
      depth: 1 + subParts.length,
      isParent: subParts.length === 0,
    }
  }

  // Fallback: try to extract leading number
  const numMatch = reqNum.match(/^(\d+)/)
  if (numMatch) {
    return {
      group: parseInt(numMatch[1], 10),
      subParts: reqNum.slice(numMatch[1].length).split('').filter(Boolean),
      depth: reqNum.length > numMatch[1].length ? 2 : 1,
      isParent: reqNum === numMatch[1],
    }
  }

  return { group: 0, subParts: [], depth: 1, isParent: true }
}

// Tree node for recursive rendering
interface RequirementNode {
  requirement: Requirement
  children: RequirementNode[]
  depth: number
}

// Build a tree structure from flat requirements using parent_requirement_id
function buildRequirementTree(requirements: Requirement[]): RequirementNode[] {
  // Check if requirements have parentRequirementId - if so, use it
  const hasParentIds = requirements.some(r => r.parentRequirementId !== undefined)

  if (hasParentIds) {
    return buildTreeFromParentIds(requirements)
  }

  // Fallback: use parsing-based grouping for legacy data
  return buildTreeFromParsing(requirements)
}

// Build tree using parent_requirement_id relationships
function buildTreeFromParentIds(requirements: Requirement[]): RequirementNode[] {
  const nodeMap = new Map<string, RequirementNode>()
  const roots: RequirementNode[] = []

  // First pass: create nodes for all requirements
  requirements.forEach(req => {
    nodeMap.set(req.id, {
      requirement: req,
      children: [],
      depth: req.nestingDepth || 1,
    })
  })

  // Second pass: build parent-child relationships
  requirements.forEach(req => {
    const node = nodeMap.get(req.id)!
    if (req.parentRequirementId) {
      const parent = nodeMap.get(req.parentRequirementId)
      if (parent) {
        parent.children.push(node)
      } else {
        // Parent not found, treat as root
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  // Sort roots by group number
  roots.sort((a, b) => {
    const parsedA = parseRequirementNumber(a.requirement.requirementNumber)
    const parsedB = parseRequirementNumber(b.requirement.requirementNumber)
    return parsedA.group - parsedB.group
  })

  // Sort children recursively
  function sortChildren(node: RequirementNode) {
    node.children.sort((a, b) => {
      const parsedA = parseRequirementNumber(a.requirement.requirementNumber)
      const parsedB = parseRequirementNumber(b.requirement.requirementNumber)
      if (parsedA.group !== parsedB.group) return parsedA.group - parsedB.group
      return parsedA.subParts.join('').localeCompare(parsedB.subParts.join(''))
    })
    node.children.forEach(sortChildren)
  }

  roots.forEach(sortChildren)
  return roots
}

// Fallback: build tree using requirement number parsing (legacy)
function buildTreeFromParsing(requirements: Requirement[]): RequirementNode[] {
  const groups = new Map<number, { parent: Requirement | null; children: Requirement[] }>()

  // Sort requirements
  const sorted = [...requirements].sort((a, b) => {
    const parsedA = parseRequirementNumber(a.requirementNumber)
    const parsedB = parseRequirementNumber(b.requirementNumber)
    if (parsedA.group !== parsedB.group) return parsedA.group - parsedB.group
    if (parsedA.isParent && !parsedB.isParent) return -1
    if (!parsedA.isParent && parsedB.isParent) return 1
    return parsedA.subParts.join('').localeCompare(parsedB.subParts.join(''))
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

  // Convert to tree nodes
  const roots: RequirementNode[] = []
  Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([, { parent, children }]) => {
      if (parent) {
        const parentNode: RequirementNode = {
          requirement: parent,
          children: children.map(c => ({
            requirement: c,
            children: [],
            depth: 2,
          })),
          depth: 1,
        }
        roots.push(parentNode)
      } else if (children.length > 0) {
        // No parent, just children - treat first as parent
        const [first, ...rest] = children
        roots.push({
          requirement: first,
          children: rest.map(c => ({
            requirement: c,
            children: [],
            depth: 2,
          })),
          depth: 1,
        })
      }
    })

  return roots
}

// Calculate completion stats for a node and its children
function getNodeStats(node: RequirementNode): { completed: number; total: number } {
  let completed = isRequirementComplete(node.requirement) ? 1 : 0
  let total = 1

  node.children.forEach(child => {
    const childStats = getNodeStats(child)
    completed += childStats.completed
    total += childStats.total
  })

  return { completed, total }
}

// Check if a single requirement is complete
function isRequirementComplete(req: Requirement) {
  return ['completed', 'approved', 'awarded'].includes(req.status)
}

// Recursive requirement node component
const RequirementNodeView = memo(function RequirementNodeView({
  node,
  unitId,
  canEdit,
  currentUserName,
  initData,
  isMeritBadge,
  meritBadgeInitData,
  collapsedNodes,
  toggleNode,
  isMultiSelectMode,
  selectedIds,
  onSelectionChange,
}: {
  node: RequirementNode
  unitId: string
  canEdit: boolean
  currentUserName?: string
  initData?: { scoutId: string; rankId: string }
  isMeritBadge?: boolean
  meritBadgeInitData?: {
    scoutId: string
    meritBadgeId: string
    meritBadgeProgressId: string
  }
  collapsedNodes: Set<string>
  toggleNode: (id: string) => void
  isMultiSelectMode?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedNodes.has(node.requirement.id)
  const stats = getNodeStats(node)
  const isComplete = stats.completed === stats.total
  const req = node.requirement

  // Check if this node's children are alternatives
  const hasAlternativeChildren = node.children.some(c => c.requirement.isAlternative)
  const requiredCount = req.requiredCount

  // For leaf nodes (no children), render just the requirement row
  if (!hasChildren) {
    return (
      <RequirementApprovalRow
        id={req.id}
        requirementProgressId={req.requirementProgressId}
        requirementNumber={req.requirementNumber}
        description={req.description}
        status={req.status}
        completedAt={req.completedAt}
        completedBy={req.completedBy}
        notes={req.notes}
        approvalStatus={req.approvalStatus}
        unitId={unitId}
        canEdit={canEdit}
        currentUserName={currentUserName}
        initData={initData}
        isMeritBadge={isMeritBadge}
        meritBadgeInitData={meritBadgeInitData}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={selectedIds?.has(req.id) ?? false}
        onSelectionChange={onSelectionChange ? () => onSelectionChange(req.id) : undefined}
      />
    )
  }

  // For nodes with children, render collapsible section
  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isComplete
        ? 'border-emerald-200 bg-emerald-50/30'
        : 'border-stone-200 bg-stone-50/30'
    )}>
      {/* Collapsible Header */}
      <button
        onClick={() => toggleNode(req.id)}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
          'hover:bg-stone-100/50',
          isCollapsed ? 'rounded-lg' : 'rounded-t-lg',
          isComplete && 'hover:bg-emerald-100/50'
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
          isComplete
            ? 'bg-emerald-200 text-emerald-800'
            : 'bg-stone-200 text-stone-700'
        )}>
          {req.requirementNumber}
        </span>

        {/* Title/Description */}
        <span className={cn(
          'flex-1 font-medium line-clamp-1',
          isComplete ? 'text-emerald-700' : 'text-stone-700'
        )}>
          {req.description.length > 80
            ? req.description.slice(0, 80) + '...'
            : req.description}
        </span>

        {/* Alternatives indicator */}
        {hasAlternativeChildren && requiredCount && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Choose {requiredCount}
          </span>
        )}

        {/* Status Indicator */}
        {isComplete ? (
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
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <div
                key={child.requirement.id}
                className={cn(
                  'ml-2 border-l-2 pl-2',
                  child.requirement.isAlternative
                    ? 'border-amber-200'
                    : 'border-stone-200'
                )}
              >
                <RequirementNodeView
                  node={child}
                  unitId={unitId}
                  canEdit={canEdit}
                  currentUserName={currentUserName}
                  initData={initData}
                  isMeritBadge={isMeritBadge}
                  meritBadgeInitData={meritBadgeInitData}
                  collapsedNodes={collapsedNodes}
                  toggleNode={toggleNode}
                  isMultiSelectMode={isMultiSelectMode}
                  selectedIds={selectedIds}
                  onSelectionChange={onSelectionChange}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// Helper to compute default collapsed nodes based on completed requirements
function computeDefaultCollapsedNodes(tree: RequirementNode[], collapseCompleted: boolean): Set<string> {
  if (!collapseCompleted) {
    return new Set()
  }

  const collapsed = new Set<string>()
  function checkNode(node: RequirementNode) {
    const stats = getNodeStats(node)
    if (stats.completed === stats.total && node.children.length > 0) {
      collapsed.add(node.requirement.id)
    }
    node.children.forEach(checkNode)
  }
  tree.forEach(checkNode)
  return collapsed
}

// Generate a stable key for requirements to detect meaningful changes
function getRequirementsKey(requirements: Requirement[]): string {
  return requirements.map(r => r.id).join(',')
}

export function HierarchicalRequirementsList({
  requirements,
  unitId,
  canEdit,
  defaultCollapseCompleted = false,
  currentUserName,
  initData,
  isMeritBadge = false,
  meritBadgeInitData,
  isMultiSelectMode = false,
  selectedIds,
  onSelectionChange,
}: HierarchicalRequirementsListProps) {
  const requirementTree = useMemo(() => {
    return buildRequirementTree(requirements)
  }, [requirements])

  // Create a stable key from requirements - used to reset state when requirements change
  const requirementsKey = useMemo(() => getRequirementsKey(requirements), [requirements])

  // Compute default collapsed state from tree structure
  const defaultCollapsed = useMemo(() =>
    computeDefaultCollapsedNodes(requirementTree, defaultCollapseCompleted),
    [requirementTree, defaultCollapseCompleted]
  )

  // Track user's manual toggles, keyed by requirements
  // The key pattern ensures toggles reset when requirements change
  const [toggleState, setToggleState] = useState<{ key: string; toggles: Set<string> }>({
    key: requirementsKey,
    toggles: new Set()
  })

  // Derive effective collapsed state: default XOR user toggles
  // Compute userToggles inside useMemo to avoid dependency issues
  const collapsedNodes = useMemo(() => {
    // Get current user toggles (resets if requirements changed)
    const userToggles = toggleState.key === requirementsKey ? toggleState.toggles : new Set<string>()

    const effective = new Set(defaultCollapsed)
    userToggles.forEach(id => {
      if (effective.has(id)) {
        effective.delete(id)
      } else {
        effective.add(id)
      }
    })
    return effective
  }, [defaultCollapsed, toggleState, requirementsKey])

  const toggleNode = useCallback((id: string) => {
    setToggleState(prev => {
      // Ensure we're working with current requirements key
      const currentToggles = prev.key === requirementsKey ? prev.toggles : new Set<string>()
      const next = new Set(currentToggles)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { key: requirementsKey, toggles: next }
    })
  }, [requirementsKey])

  if (requirements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-stone-500">
        No requirements loaded
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {requirementTree.map((node) => (
        <RequirementNodeView
          key={node.requirement.id}
          node={node}
          unitId={unitId}
          canEdit={canEdit}
          currentUserName={currentUserName}
          initData={initData}
          isMeritBadge={isMeritBadge}
          meritBadgeInitData={meritBadgeInitData}
          collapsedNodes={collapsedNodes}
          toggleNode={toggleNode}
          isMultiSelectMode={isMultiSelectMode}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  )
}
