'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SettingsTabsProps {
  defaultTab: string
  isAdmin: boolean
  unitTabContent: React.ReactNode
  dataTabContent: React.ReactNode
  integrationsTabContent: React.ReactNode
}

export function SettingsTabs({
  defaultTab,
  isAdmin,
  unitTabContent,
  dataTabContent,
  integrationsTabContent,
}: SettingsTabsProps) {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {isAdmin && <TabsTrigger value="unit">Unit</TabsTrigger>}
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      {isAdmin && (
        <TabsContent value="unit">
          {unitTabContent}
        </TabsContent>
      )}

      <TabsContent value="data">
        {dataTabContent}
      </TabsContent>

      <TabsContent value="integrations">
        {integrationsTabContent}
      </TabsContent>
    </Tabs>
  )
}
