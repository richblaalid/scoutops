'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { RequirementAssignDialog } from './requirement-assign-dialog'
import { Check } from 'lucide-react'

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

// Section names for each rank's requirement groups
const rankSectionNames: Record<string, Record<string, string>> = {
  scout: {
    '1': 'Scout Oath, Law & Spirit',
    '2': 'Troop Meetings',
    '3': 'Patrol Method',
    '4': 'Knots & Ropework',
    '5': 'Knife Safety',
    '6': 'Youth Protection',
    '7': 'Scoutmaster Conference',
  },
  tenderfoot: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking',
    '3': 'Tools',
    '4': 'First Aid & Nature',
    '5': 'Hiking',
    '6': 'Fitness',
    '7': 'Citizenship',
    '8': 'Leadership',
    '9': 'Scout Spirit',
    '10': 'Scoutmaster Conference',
    '11': 'Board of Review',
  },
  second_class: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking & Tools',
    '3': 'Navigation',
    '4': 'Nature',
    '5': 'Aquatics',
    '6': 'First Aid',
    '7': 'Fitness',
    '8': 'Citizenship',
    '9': 'Leadership',
    '10': 'Scout Spirit',
    '11': 'Scoutmaster Conference',
    '12': 'Board of Review',
  },
  first_class: {
    '1': 'Camping & Outdoor Ethics',
    '2': 'Cooking',
    '3': 'Tools',
    '4': 'Navigation',
    '5': 'Nature',
    '6': 'Aquatics',
    '7': 'First Aid & Emergency',
    '8': 'Fitness',
    '9': 'Citizenship',
    '10': 'Leadership',
    '11': 'Scout Spirit',
    '12': 'Scoutmaster Conference',
    '13': 'Board of Review',
  },
  star: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Project',
    '6': 'Scoutmaster Conference',
    '7': 'Board of Review',
  },
  life: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Project',
    '6': 'Scoutmaster Conference',
    '7': 'Board of Review',
  },
  eagle: {
    '1': 'Active Participation',
    '2': 'Scout Spirit',
    '3': 'Merit Badges',
    '4': 'Leadership',
    '5': 'Service Hours',
    '6': 'Eagle Project',
    '7': 'Scoutmaster Conference',
    '8': 'Board of Review',
  },
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

  // Group requirements by their main number
  const groupedRequirements = useMemo(() => {
    const groups = new Map<string, Requirement[]>()

    const sortedReqs = [...requirements].sort((a, b) => a.display_order - b.display_order)

    for (const req of sortedReqs) {
      const mainNumber = req.requirement_number
      if (!groups.has(mainNumber)) {
        groups.set(mainNumber, [])
      }
      groups.get(mainNumber)!.push(req)
    }

    return groups
  }, [requirements])

  const handleAssignClick = (requirement: Requirement) => {
    setSelectedRequirement(requirement)
    setIsDialogOpen(true)
  }

  // Get section name for a requirement number
  const getSectionName = (reqNumber: string) => {
    return rankSectionNames[rank.code]?.[reqNumber] || `Section ${reqNumber}`
  }

  // Get the full display number for a requirement
  const getFullNumber = (req: Requirement) => {
    return `${req.requirement_number}${req.sub_requirement_letter || ''}`
  }

  return (
    <>
      <div className="space-y-6">
        {Array.from(groupedRequirements.entries()).map(([sectionNum, reqs]) => (
          <div key={sectionNum} className="overflow-hidden rounded-lg border border-stone-200">
            {/* Section Header */}
            <div className="border-b border-stone-200 bg-forest-50 px-4 py-3">
              <h3 className="flex items-center gap-3 font-semibold text-forest-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-600 text-sm text-white">
                  {sectionNum}
                </span>
                {getSectionName(sectionNum)}
              </h3>
            </div>

            {/* Requirements Table */}
            <table className="w-full">
              <tbody>
                {reqs.map((req, idx) => {
                  const isLast = idx === reqs.length - 1

                  return (
                    <tr
                      key={req.id}
                      className={`${!isLast ? 'border-b border-stone-100' : ''} ${
                        idx % 2 === 1 ? 'bg-stone-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="w-16 px-4 py-3 align-top font-mono text-sm font-medium text-stone-700">
                        {getFullNumber(req)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-sm text-stone-700">{req.description}</p>
                      </td>
                      {canEdit && (
                        <td className="w-28 px-4 py-3 text-right align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignClick(req)}
                            className="h-8 text-xs"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Sign Off
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
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
