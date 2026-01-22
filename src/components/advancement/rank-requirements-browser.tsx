'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UnitRankPanel } from './unit-rank-panel'
import { RankIcon } from './rank-icon'
import { Award } from 'lucide-react'

interface Rank {
  id: string
  code: string
  name: string
  display_order: number
  is_eagle_required: boolean | null
  description: string | null
  image_url?: string | null
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
  currentUserName?: string
}

export function RankRequirementsBrowser({
  ranks,
  requirements,
  scouts,
  unitId,
  versionId,
  canEdit,
  currentUserName = 'Leader',
}: RankRequirementsBrowserProps) {
  const [selectedRank, setSelectedRank] = useState(ranks[0]?.code || 'scout')

  const currentRank = ranks.find((r) => r.code === selectedRank)

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
              Select requirements and sign off for multiple scouts
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

            return (
              <TabsContent key={rank.code} value={rank.code} className="mt-0">
                <UnitRankPanel
                  rank={rank}
                  requirements={reqs}
                  scouts={scouts}
                  unitId={unitId}
                  versionId={versionId}
                  canEdit={canEdit}
                  currentUserName={currentUserName}
                />
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}
