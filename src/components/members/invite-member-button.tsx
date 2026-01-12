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

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface InviteMemberButtonProps {
  unitId: string
  scouts: Scout[]
  sections?: Section[]
}

export function InviteMemberButton({ unitId, scouts, sections = [] }: InviteMemberButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Invite Member</Button>
      {isOpen && (
        <InviteMemberForm
          unitId={unitId}
          scouts={scouts}
          sections={sections}
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
