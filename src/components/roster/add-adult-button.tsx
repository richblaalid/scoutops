'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AdultForm } from './adult-form'

interface AddAdultButtonProps {
  unitId: string
}

export function AddAdultButton({ unitId }: AddAdultButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Adult</Button>
      {isOpen && (
        <AdultForm
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
