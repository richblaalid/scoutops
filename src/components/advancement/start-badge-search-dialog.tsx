'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MeritBadgeIcon } from './merit-badge-icon'
import { getBsaMeritBadges, startMeritBadge } from '@/app/actions/advancement'
import { useRouter } from 'next/navigation'
import { Search, Star, Award, Filter, Check, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MeritBadge {
  id: string
  code: string
  name: string
  category: string | null
  description: string | null
  is_eagle_required: boolean | null
  is_active: boolean | null
  image_url: string | null
}

interface StartBadgeSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scoutId: string
  unitId: string
  alreadyTrackingIds: string[] // Badge IDs scout is already tracking
}

type FilterType = 'all' | 'eagle' | 'category'

export function StartBadgeSearchDialog({
  open,
  onOpenChange,
  scoutId,
  unitId,
  alreadyTrackingIds,
}: StartBadgeSearchDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [badges, setBadges] = useState<MeritBadge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [startingBadgeId, setStartingBadgeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch badges when dialog opens
  useEffect(() => {
    if (open && badges.length === 0) {
      /* eslint-disable react-hooks/set-state-in-effect -- Data fetching pattern */
      setIsLoading(true)
      /* eslint-enable react-hooks/set-state-in-effect */
      getBsaMeritBadges()
        .then((data) => {
          setBadges(data as MeritBadge[])
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, badges.length])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      /* eslint-disable react-hooks/set-state-in-effect -- Dialog cleanup pattern */
      setSearchQuery('')
      setActiveFilter('all')
      setSelectedCategory(null)
      setError(null)
      setStartingBadgeId(null)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open])

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    badges.forEach((badge) => {
      if (badge.category) cats.add(badge.category)
    })
    return Array.from(cats).sort()
  }, [badges])

  // Filter badges
  const filteredBadges = useMemo(() => {
    let result = badges

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (badge) =>
          badge.name.toLowerCase().includes(query) ||
          badge.category?.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (activeFilter === 'eagle') {
      result = result.filter((badge) => badge.is_eagle_required)
    } else if (activeFilter === 'category' && selectedCategory) {
      result = result.filter((badge) => badge.category === selectedCategory)
    }

    return result
  }, [badges, searchQuery, activeFilter, selectedCategory])

  // Check if a badge is already being tracked
  const isTracking = (badgeId: string) => alreadyTrackingIds.includes(badgeId)

  // Handle badge click
  const handleBadgeClick = (badge: MeritBadge) => {
    if (isTracking(badge.id)) return // Already tracking
    if (isPending || startingBadgeId) return // Already starting another badge

    setError(null)
    setStartingBadgeId(badge.id)

    startTransition(async () => {
      const result = await startMeritBadge(scoutId, badge.id, unitId)

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to start badge')
        setStartingBadgeId(null)
      }
    })
  }

  const eagleCount = badges.filter((b) => b.is_eagle_required).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-forest-600" />
            Start Merit Badge
          </DialogTitle>
          <DialogDescription>
            Search and select a merit badge to start tracking
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              placeholder="Search merit badges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveFilter('all')
                setSelectedCategory(null)
              }}
              className="h-8"
            >
              All
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {badges.length}
              </Badge>
            </Button>

            <Button
              variant={activeFilter === 'eagle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveFilter('eagle')
                setSelectedCategory(null)
              }}
              className="h-8"
            >
              <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
              Eagle Required
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {eagleCount}
              </Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeFilter === 'category' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                >
                  <Filter className="mr-1 h-3 w-3" />
                  {selectedCategory || 'By Category'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => {
                      setActiveFilter('category')
                      setSelectedCategory(category)
                    }}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Badge Grid */}
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border bg-stone-50 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
              </div>
            ) : filteredBadges.length === 0 ? (
              <div className="py-12 text-center">
                <Award className="mx-auto h-12 w-12 text-stone-300" />
                <p className="mt-4 text-stone-500">No badges found matching your criteria</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setActiveFilter('all')
                    setSelectedCategory(null)
                  }}
                  className="mt-4"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {filteredBadges.map((badge) => {
                  const tracking = isTracking(badge.id)
                  const starting = startingBadgeId === badge.id

                  return (
                    <button
                      key={badge.id}
                      onClick={() => handleBadgeClick(badge)}
                      disabled={tracking || isPending}
                      className={`relative flex flex-col items-center rounded-lg border p-2 text-center transition-all ${
                        tracking
                          ? 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'
                          : starting
                          ? 'border-forest-300 bg-forest-50'
                          : 'border-stone-200 bg-white hover:border-forest-300 hover:shadow-md'
                      }`}
                    >
                      {/* Eagle Required Badge */}
                      {badge.is_eagle_required && (
                        <div className="absolute -right-1 -top-1 z-10">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow ring-2 ring-white">
                            <Star className="h-2.5 w-2.5 fill-white text-white" />
                          </div>
                        </div>
                      )}

                      {/* Already Tracking Badge */}
                      {tracking && (
                        <div className="absolute -left-1 -top-1 z-10">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-600 shadow ring-2 ring-white">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Badge Icon */}
                      <div className="relative mb-1">
                        {starting ? (
                          <Loader2 className="h-12 w-12 animate-spin text-forest-500" />
                        ) : (
                          <MeritBadgeIcon
                            badge={badge}
                            size="md"
                          />
                        )}
                      </div>

                      {/* Badge Name */}
                      <span className="line-clamp-2 text-xs font-medium text-stone-900">
                        {badge.name}
                      </span>

                      {/* Tracking indicator */}
                      {tracking && (
                        <span className="mt-0.5 text-[10px] text-forest-600">
                          Tracking
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Results Count */}
          <p className="text-center text-xs text-stone-500">
            {filteredBadges.length} badges shown • Click a badge to start tracking
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
