'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScoutForm } from './scout-form'

interface Section {
  id: string
  name: string
  unit_number: string
  unit_gender: 'boys' | 'girls' | null
}

interface AddScoutButtonProps {
  unitId: string
  sections?: Section[]
}

export function AddScoutButton({ unitId, sections = [] }: AddScoutButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Scout</Button>
      {isOpen && (
        <ScoutForm
          unitId={unitId}
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
