'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScoutForm } from './scout-form'
import { Pencil } from 'lucide-react'

interface EditScoutButtonProps {
  unitId: string
  scout: {
    id: string
    first_name: string
    last_name: string
    patrol: string | null
    rank: string | null
    date_of_birth: string | null
    bsa_member_id: string | null
    is_active: boolean | null
  }
}

export function EditScoutButton({ unitId, scout }: EditScoutButtonProps) {
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
