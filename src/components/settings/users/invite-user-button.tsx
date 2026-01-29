'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { InviteUserForm } from './invite-user-form'

interface Scout {
  id: string
  first_name: string
  last_name: string
}

interface InviteUserButtonProps {
  unitId: string
  scouts: Scout[]
}

export function InviteUserButton({ unitId, scouts }: InviteUserButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Invite User</Button>
      {isOpen && (
        <InviteUserForm
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
