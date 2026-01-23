import { Badge } from "@/components/ui/badge"

interface VersionYearBadgeProps {
  year: number | null | undefined
  className?: string
}

export function VersionYearBadge({ year, className }: VersionYearBadgeProps) {
  if (!year) return null

  return (
    <Badge variant="secondary" className={className}>
      Version {year}
    </Badge>
  )
}
