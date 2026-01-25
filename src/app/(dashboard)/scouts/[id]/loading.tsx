import { Skeleton } from '@/components/ui/skeleton'

export default function ScoutDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Rank badge placeholder */}
          <Skeleton className="hidden h-16 w-16 rounded-full sm:block" />
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <span className="text-stone-400">/</span>
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Name */}
            <Skeleton className="mt-2 h-9 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-stone-200 bg-white">
        <div className="flex border-b border-stone-200">
          <Skeleton className="m-1 h-10 w-32" />
          <Skeleton className="m-1 h-10 w-24" />
        </div>

        <div className="p-4 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-stone-200 bg-cream-300/50 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="mt-1 h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Advancement Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-44" />
            </div>
            <Skeleton className="h-4 w-72" />

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-stone-200 pb-2">
              {['Ranks', 'Badges', 'Leadership', 'Activities'].map((tab) => (
                <Skeleton key={tab} className="h-9 w-24" />
              ))}
            </div>

            {/* Trail to Eagle */}
            <div className="rounded-lg border border-stone-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-28" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>

              {/* Rank badges row */}
              <div className="flex items-center justify-between">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <Skeleton className="mt-4 h-2 w-full rounded-full" />
            </div>
          </div>

          {/* Requirements section placeholder */}
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
