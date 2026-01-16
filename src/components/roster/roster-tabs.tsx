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
  current_position: string | null
  current_position_2: string | null
  scout_accounts: { id: string; billing_balance: number | null } | null
}

interface RosterAdult {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  member_type: string | null
  position: string | null
  position_2: string | null
  patrol: string | null
  bsa_member_id: string | null
  renewal_status: string | null
  expiration_date: string | null
  is_active: boolean | null
  user_id: string | null  // indicates if they have an app account
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
