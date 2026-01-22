import { Skeleton } from '@/components/ui/skeleton'

export default function AdvancementLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-stone-200 pb-2">
          {['Summary', 'Ranks', 'Merit Badges'].map((tab) => (
            <Skeleton key={tab} className="h-9 w-24" />
          ))}
        </div>

        {/* Content area */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
              </div>
              <Skeleton className="mt-4 h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
