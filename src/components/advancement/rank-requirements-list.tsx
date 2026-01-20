'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RequirementAssignDialog } from './requirement-assign-dialog'
import { UserPlus } from 'lucide-react'

interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
}

interface Requirement {
  id: string
  version_id: string
  rank_id: string
  requirement_number: string
  parent_requirement_id: string | null
  sub_requirement_letter: string | null
  description: string
  is_alternative: boolean | null
  alternatives_group: string | null
  display_order: number
}

interface RequirementProgress {
  id: string
  requirement_id: string
  status: string
}

interface RankProgress {
  id: string
  rank_id: string
  status: string
  scout_rank_requirement_progress: RequirementProgress[]
}

interface Scout {
  id: string
  first_name: string
  last_name: string
  rank: string | null
  is_active: boolean | null
  scout_rank_progress: RankProgress[]
}

interface RankRequirementsListProps {
  rank: Rank
  requirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
  canEdit: boolean
}

export function RankRequirementsList({
  rank,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
}: RankRequirementsListProps) {
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Get top-level requirements (no parent)
  const topLevelRequirements = requirements
    .filter((req) => !req.parent_requirement_id)
    .sort((a, b) => a.display_order - b.display_order)

  // Get sub-requirements for a parent
  const getSubRequirements = (parentId: string) =>
    requirements
      .filter((req) => req.parent_requirement_id === parentId)
      .sort((a, b) => a.display_order - b.display_order)

  const handleAssignClick = (requirement: Requirement) => {
    setSelectedRequirement(requirement)
    setIsDialogOpen(true)
  }

  // Get completion stats for a requirement
  const getCompletionStats = (requirementId: string) => {
    let completed = 0
    let inProgress = 0

    scouts.forEach((scout) => {
      const rankProgress = scout.scout_rank_progress.find((rp) => rp.rank_id === rank.id)
      if (rankProgress) {
        inProgress++
        const reqProgress = rankProgress.scout_rank_requirement_progress.find(
          (rp) => rp.requirement_id === requirementId
        )
        if (reqProgress && ['completed', 'approved', 'awarded'].includes(reqProgress.status)) {
          completed++
        }
      }
    })

    return { completed, inProgress }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-stone-50 text-left text-sm font-medium text-stone-600">
              <th className="w-16 px-4 py-3">#</th>
              <th className="px-4 py-3">Requirement</th>
              <th className="w-32 px-4 py-3 text-center">Progress</th>
              {canEdit && <th className="w-28 px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {topLevelRequirements.map((req) => {
              const subReqs = getSubRequirements(req.id)
              const stats = getCompletionStats(req.id)
              const hasSubReqs = subReqs.length > 0

              return (
                <>
                  <tr key={req.id} className="border-b last:border-0">
                    <td className="px-4 py-3 align-top font-mono text-sm font-medium text-stone-900">
                      {req.requirement_number}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-stone-900">{req.description}</p>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      {stats.inProgress > 0 ? (
                        <span className="text-xs text-stone-500">
                          {stats.completed}/{stats.inProgress}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right align-top">
                        {!hasSubReqs && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignClick(req)}
                            className="h-8 text-xs"
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            Assign
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                  {subReqs.map((subReq) => {
                    const subStats = getCompletionStats(subReq.id)
                    return (
                      <tr key={subReq.id} className="border-b bg-stone-50/50 last:border-0">
                        <td className="px-4 py-2 pl-8 align-top font-mono text-sm text-stone-600">
                          {subReq.requirement_number}
                          {subReq.sub_requirement_letter}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <p className="text-sm text-stone-700">{subReq.description}</p>
                        </td>
                        <td className="px-4 py-2 text-center align-top">
                          {subStats.inProgress > 0 ? (
                            <span className="text-xs text-stone-500">
                              {subStats.completed}/{subStats.inProgress}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-400">-</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-2 text-right align-top">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignClick(subReq)}
                              className="h-7 text-xs"
                            >
                              <UserPlus className="mr-1 h-3 w-3" />
                              Assign
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedRequirement && (
        <RequirementAssignDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          requirement={selectedRequirement}
          rank={rank}
          scouts={scouts}
          unitId={unitId}
          versionId={versionId}
        />
      )}
    </>
  )
}
