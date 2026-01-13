'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScoutForm } from './scout-form'

interface AddScoutButtonProps {
  unitId: string
}

export function AddScoutButton({ unitId }: AddScoutButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Scout</Button>
      {isOpen && (
        <ScoutForm
          unitId={unitId}
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
