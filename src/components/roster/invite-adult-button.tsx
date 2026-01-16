'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { InviteRosterAdultDialog } from './invite-roster-adult-dialog'

interface InviteAdultButtonProps {
  unitId: string
  adult: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    email?: string | null
    member_type: string | null
    position: string | null
    bsa_member_id: string | null
    user_id: string | null
  }
}

export function InviteAdultButton({ unitId, adult }: InviteAdultButtonProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        Invite to App
      </Button>

      <InviteRosterAdultDialog
        adult={adult}
        unitId={unitId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  )
}
