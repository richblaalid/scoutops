'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface CollapsibleCardProps {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleCard({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={className}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-stone-50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-stone-500 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
