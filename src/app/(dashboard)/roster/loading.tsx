import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function RosterLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-44" />
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-stone-200 pb-2 mb-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>

          {/* Search and filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Table header */}
          <div className="rounded-md border">
            <div className="flex items-center border-b bg-stone-50 px-4 py-3">
              <Skeleton className="h-4 w-32 mr-auto" />
              <Skeleton className="h-4 w-16 mx-4" />
              <Skeleton className="h-4 w-20 mx-4" />
              <Skeleton className="h-4 w-24 mx-4" />
              <Skeleton className="h-4 w-16 mx-4" />
              <Skeleton className="h-4 w-20 mx-4" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Table rows */}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center border-b px-4 py-3 last:border-b-0">
                <div className="flex items-center gap-3 mr-auto">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-28 text-stone-400" />
                </div>
                <Skeleton className="h-4 w-16 mx-4" />
                <Skeleton className="h-4 w-20 mx-4" />
                <Skeleton className="h-4 w-24 mx-4" />
                <Skeleton className="h-6 w-16 rounded-full mx-4" />
                <Skeleton className="h-4 w-16 mx-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
