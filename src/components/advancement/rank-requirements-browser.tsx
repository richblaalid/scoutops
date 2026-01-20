'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RankRequirementsList } from './rank-requirements-list'
import { RankIcon } from './rank-icon'
import { Award } from 'lucide-react'

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

interface RankRequirementsBrowserProps {
  ranks: Rank[]
  requirements: Requirement[]
  scouts: Scout[]
  unitId: string
  versionId: string
  canEdit: boolean
}

export function RankRequirementsBrowser({
  ranks,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
}: RankRequirementsBrowserProps) {
  const [selectedRank, setSelectedRank] = useState(ranks[0]?.code || 'scout')

  const currentRank = ranks.find((r) => r.code === selectedRank)
  const rankRequirements = requirements.filter((req) => req.rank_id === currentRank?.id)

  // Count top-level requirements (no parent)
  const topLevelRequirements = rankRequirements.filter((req) => !req.parent_requirement_id)

  // Get scouts working on this rank
  const scoutsWorkingOnRank = scouts.filter((scout) =>
    scout.scout_rank_progress.some(
      (progress) => progress.rank_id === currentRank?.id && progress.status === 'in_progress'
    )
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-forest-600" />
              Scouts BSA Rank Requirements
            </CardTitle>
            <CardDescription>
              Select a rank to view requirements and assign completions
            </CardDescription>
          </div>
          {scoutsWorkingOnRank.length > 0 && (
            <Badge variant="secondary">
              {scoutsWorkingOnRank.length} scout{scoutsWorkingOnRank.length !== 1 ? 's' : ''} working on {currentRank?.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRank} onValueChange={setSelectedRank}>
          <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
            {ranks.map((rank) => (
              <TabsTrigger
                key={rank.code}
                value={rank.code}
                className="flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <RankIcon rank={rank} size="sm" />
                <span className="hidden sm:inline">{rank.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {ranks.map((rank) => {
            const reqs = requirements.filter((req) => req.rank_id === rank.id)
            const topLevel = reqs.filter((req) => !req.parent_requirement_id)

            return (
              <TabsContent key={rank.code} value={rank.code} className="mt-0">
                <div className="mb-4 flex items-start gap-4 rounded-lg bg-stone-50 p-4">
                  <RankIcon rank={rank} size="lg" />
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{rank.name} Rank</h3>
                    {rank.description && (
                      <p className="mt-1 text-sm text-stone-600">{rank.description}</p>
                    )}
                    <p className="mt-2 text-sm text-stone-500">
                      {topLevel.length} requirement{topLevel.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <RankRequirementsList
                  rank={rank}
                  requirements={reqs}
                  scouts={scouts}
                  unitId={unitId}
                  versionId={versionId}
                  canEdit={canEdit}
                />
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
