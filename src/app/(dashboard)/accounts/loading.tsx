import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AccountsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-8 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>

        <Card className="border-t-2 border-t-amber-500">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-8 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-8 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-28" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {/* Table header */}
            <div className="flex items-center border-b bg-stone-50 px-4 py-3">
              <Skeleton className="h-4 w-32 mr-auto" />
              <Skeleton className="h-4 w-16 mx-8" />
              <Skeleton className="h-4 w-24 mx-8" />
              <Skeleton className="h-4 w-24 mx-8" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Table rows */}
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center border-b px-4 py-3 last:border-b-0">
                <div className="mr-auto">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16 mx-8" />
                <Skeleton className="h-4 w-20 mx-8" />
                <Skeleton className="h-4 w-20 mx-8" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-10" />
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
