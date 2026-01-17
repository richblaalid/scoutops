'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScoutForm } from './scout-form'
import { Pencil } from 'lucide-react'

interface Guardian {
  id: string
  relationship: string | null
  is_primary: boolean | null
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface AvailableMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface EditScoutButtonProps {
  unitId: string
  scout: {
    id: string
    first_name: string
    last_name: string
    patrol_id: string | null
    rank: string | null
    date_of_birth: string | null
    bsa_member_id: string | null
    is_active: boolean | null
  }
  guardians?: Guardian[]
  availableMembers?: AvailableMember[]
}

export function EditScoutButton({ unitId, scout, guardians = [], availableMembers = [] }: EditScoutButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Pencil className="mr-2 h-4 w-4" />
        Edit Scout
      </Button>
      {isOpen && (
        <ScoutForm
          unitId={unitId}
          scout={scout}
          guardians={guardians}
          availableMembers={availableMembers}
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
