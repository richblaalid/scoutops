'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { InviteMemberForm } from './invite-member-form'

interface Scout {
  id: string
  first_name: string
  last_name: string
}

interface InviteMemberButtonProps {
  unitId: string
  scouts: Scout[]
}

export function InviteMemberButton({ unitId, scouts }: InviteMemberButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Invite Member</Button>
      {isOpen && (
        <InviteMemberForm
          unitId={unitId}
          scouts={scouts}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            setIsOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
