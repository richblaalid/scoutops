'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScoutForm } from './scout-form'

interface AddScoutButtonProps {
  unitId: string
}

export function AddScoutButton({ unitId }: AddScoutButtonProps) {
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
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
