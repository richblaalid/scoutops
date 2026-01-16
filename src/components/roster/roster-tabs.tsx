'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScoutsList } from '@/components/scouts/scouts-list'
import { AdultsList } from './adults-list'

interface Scout {
  id: string
  first_name: string
  last_name: string
  patrol: string | null
  patrol_id: string | null
  rank: string | null
  is_active: boolean | null
  date_of_birth: string | null
  bsa_member_id: string | null
  scout_accounts: { id: string; billing_balance: number | null } | null
}

interface RosterAdult {
  id: string
  first_name: string
  last_name: string
  full_name: string
  member_type: string
  position: string | null
  patrol: string | null
  bsa_member_id: string
  renewal_status: string | null
  expiration_date: string | null
  is_active: boolean | null
  profile_id: string | null
  linked_at: string | null
}

interface RosterTabsProps {
  scouts: Scout[]
  adults: RosterAdult[]
  canManageScouts: boolean
  canManageAdults: boolean
  unitId: string
}

export function RosterTabs({ scouts, adults, canManageScouts, canManageAdults, unitId }: RosterTabsProps) {
  return (
    <Tabs defaultValue="scouts" className="w-full">
      <TabsList>
        <TabsTrigger value="scouts">
          Scouts ({scouts.length})
        </TabsTrigger>
        <TabsTrigger value="adults">
          Adults ({adults.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scouts">
        <ScoutsList scouts={scouts} canManage={canManageScouts} unitId={unitId} />
      </TabsContent>
      <TabsContent value="adults">
        <AdultsList adults={adults} canManage={canManageAdults} unitId={unitId} />
      </TabsContent>
    </Tabs>
  )
}
