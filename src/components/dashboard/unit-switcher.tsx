'use client'

import { useUnit } from '@/components/providers/unit-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UnitSwitcher() {
  const {
    currentUnit,
    units,
    linkedGroup,
    linkedUnits,
    combinedView,
    setCombinedView,
    switchUnit
  } = useUnit()

  // Don't show switcher if only one unit
  if (units.length <= 1 && !linkedGroup) {
    return null
  }

  const hasLinkedUnits = linkedUnits.length > 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <span className="font-medium">
            {currentUnit?.unit_type} {currentUnit?.unit_number}
          </span>
          {currentUnit?.unit_gender && (
            <span className="text-xs text-muted-foreground capitalize">
              ({currentUnit.unit_gender})
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {hasLinkedUnits && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {linkedGroup?.name || 'Linked Troops'}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setCombinedView(!combinedView)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span>Combined View</span>
              <span className={cn(
                "ml-auto text-xs",
                combinedView ? "text-forest-600 font-medium" : "text-muted-foreground"
              )}>
                {combinedView ? 'On' : 'Off'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Unit
            </DropdownMenuLabel>
            {linkedUnits.map(unit => (
              <DropdownMenuItem
                key={unit.id}
                onClick={() => switchUnit(unit.id)}
                className={cn(
                  "gap-2",
                  unit.id === currentUnit?.id && "bg-accent"
                )}
              >
                <span className="capitalize">
                  {unit.unit_type} {unit.unit_number}
                </span>
                {unit.unit_gender && (
                  <span className="text-xs text-muted-foreground capitalize">
                    ({unit.unit_gender})
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {units.length > linkedUnits.length && (
          <>
            {hasLinkedUnits && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Other Units
            </DropdownMenuLabel>
            {units
              .filter(u => !linkedUnits.some(lu => lu.id === u.id))
              .map(unit => (
                <DropdownMenuItem
                  key={unit.id}
                  onClick={() => switchUnit(unit.id)}
                  className={cn(
                    "gap-2",
                    unit.id === currentUnit?.id && "bg-accent"
                  )}
                >
                  <span className="capitalize">
                    {unit.unit_type} {unit.unit_number}
                  </span>
                </DropdownMenuItem>
              ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
