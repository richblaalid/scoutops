import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      {/* Success/Error banner placeholder */}
      <Skeleton className="h-12 w-full rounded-lg" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Form cards */}
      <div className="grid gap-6">
        {/* Unit Info Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-1 h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Patrols Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-1 h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-10 w-28" />
          </CardContent>
        </Card>

        {/* Logo Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-1 h-4 w-52" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
